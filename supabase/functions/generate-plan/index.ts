import { withSupabase } from "@supabase/server";

const DEEPSEEK_MODEL = "deepseek/deepseek-v4-flash-0731";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_TOOL_ROUNDS = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CatalogItem {
  id: string;
  name: string;
  abv: number;
  typical_ml: number;
  category: string;
}

interface LockedDrink {
  catalog_id: string;
  quantity: number;
  unit: "ml" | "oz" | "shots" | "pints" | "glass";
  ethanol_ml: number;
}

interface Preferences {
  sweet: number;
  strong: number;
  categories_liked: string[];
  categories_avoided: string[];
}

interface GeneratePlanRequest {
  target_ethanol_ml: number;
  duration_minutes: number;
  preferences: Preferences;
  catalog: CatalogItem[];
  locked_drinks?: LockedDrink[];
  exclude?: string[];
}

interface PlanDrink {
  catalog_id: string;
  quantity: number;
  unit: "ml" | "oz" | "shots" | "pints" | "glass";
  ml?: number;
}

interface PlanResponse {
  drinks: PlanDrink[];
  notes: string;
  actual_total_ethanol_ml?: number;
}

const SYSTEM_INSTRUCTIONS = `You are a drink planning assistant for the DrinkSmart app.

You will receive:
- A pure-ethanol budget in mL (target_ethanol_ml) — the total alcohol the user should consume
- A drinking duration in minutes
- Per-call user preferences (sweet 0-1, strong 0-1, categories liked/avoided)
- A catalog of available drinks. Each row gives (id | name | abv% | typical_ml | ethanol_ml | category) where ethanol_ml is the pure-ethanol contribution of ONE typical serving.

Your job: select drinks from the catalog so that the total ethanol reaches target_ethanol_ml (aim within ±5%, never undershoot by more than 10%), and order them.

Filling the budget is the highest priority. The user picked a target BAC — if the plan undershoots, they don't reach it.

IMPORTANT: You have a calculate_ethanol tool. ALWAYS call it with your draft picks before submitting. If the result shows a deficit > 5%, adjust your picks (add quantity or another drink) and check again. Only call submit_plan once the calculator confirms you're within range.

Variety rule (people stick to a few drinks):
- Prefer 1–2 distinct catalog items per session. Increase the quantity of an existing pick before introducing a new catalog item.
- Only branch beyond 2 distinct items when ANY of: duration_minutes > 240, preferences.categories_liked has ≥3 entries, or target_ethanol_ml > 80.
- Even then cap at 3 distinct items unless the user clearly signalled variety via a long categories_liked list.

Hard rules:
- Pick only from the provided catalog. NEVER invent drinks or ABVs. Use exact catalog_id values.
- Do not pick any drink whose category appears in preferences.categories_avoided.
- For each chosen drink set quantity and unit. quantity is a count of typical servings (so two pints of the same beer = one entry with quantity: 2, not two entries). Only override ml when you genuinely want a non-default size for an ml/oz drink.
- Pick a reasonable number of total servings for the duration (rule of thumb: 1 serving per 30–60 min).

Ordering: lighter drinks earlier, the heaviest in the middle third of the plan, taper toward the end. Soft rule.

Selection bias from preferences (soft):
- preferences.sweet near 1 → favour sweeter drinks (cocktails, alcopops, dessert wines)
- preferences.sweet near 0 → favour dry drinks (dry wines, beers, neat spirits)
- preferences.strong near 1 → favour higher ABV drinks (spirits, shots, fortified wine)
- preferences.strong near 0 → favour lower ABV drinks (beers, ciders, low-ABV cocktails)
- categories_liked → boost these
- categories_avoided → exclude entirely (hard rule above)

Workflow: draft your picks, call calculate_ethanol to verify, adjust if needed, then call submit_plan.`;

function ethanolPerServing(item: CatalogItem): number {
  return item.typical_ml * (item.abv / 100);
}

function buildCatalogBlock(catalog: CatalogItem[]): string {
  return [
    "Drink catalog (id | name | abv% | typical_ml | ethanol_ml | category):",
    ...catalog.map(
      (c) =>
        `${c.id} | ${c.name} | ${c.abv}% | ${c.typical_ml}ml | ${ethanolPerServing(c).toFixed(1)}ml | ${c.category}`
    ),
  ].join("\n");
}

function planDrinkEthanol(drink: PlanDrink, item: CatalogItem): number {
  const qty = drink.quantity || 1;
  if (drink.unit === "ml" || drink.unit === "oz") {
    const serving = drink.ml ?? item.typical_ml;
    return serving * qty * (item.abv / 100);
  }
  return qty * item.typical_ml * (item.abv / 100);
}

const VALID_UNITS = new Set(["ml", "oz", "shots", "pints", "glass"]);

/**
 * Admission gate for the model's submitted plan. Every row must resolve
 * against the FILTERED server catalogue with structurally valid values, and
 * the recomputed total must land within ±10% of the target. Anything invalid
 * rejects the whole answer — no row is silently dropped, and the model's own
 * arithmetic is never trusted. A large but well-shaped quantity is not
 * independently invalid; deterministic target deviation is the size guard.
 */
function validateSubmittedPlan(
  plan: PlanResponse,
  catalogById: Map<string, CatalogItem>,
  targetEthanolMl: number
): { ok: true; totalEthanolMl: number } | { ok: false; reason: string } {
  if (!plan || typeof plan !== "object") {
    return { ok: false, reason: "submitted plan is not an object" };
  }
  if (!Array.isArray(plan.drinks)) {
    return { ok: false, reason: "drinks must be an array" };
  }

  let total = 0;
  for (const drink of plan.drinks) {
    if (!drink || typeof drink !== "object") {
      return { ok: false, reason: "malformed drink row" };
    }
    if (typeof drink.catalog_id !== "string" || drink.catalog_id.length === 0) {
      return { ok: false, reason: "catalog_id must be a non-empty string" };
    }
    const item = catalogById.get(drink.catalog_id);
    if (!item) {
      return { ok: false, reason: `unknown catalog_id: ${drink.catalog_id}` };
    }
    if (
      typeof drink.quantity !== "number" ||
      !Number.isFinite(drink.quantity) ||
      drink.quantity <= 0
    ) {
      return { ok: false, reason: "quantity must be finite and strictly greater than zero" };
    }
    if (typeof drink.unit !== "string" || !VALID_UNITS.has(drink.unit)) {
      return { ok: false, reason: `invalid unit: ${drink.unit}` };
    }
    if (
      drink.ml !== undefined &&
      (typeof drink.ml !== "number" || !Number.isFinite(drink.ml) || drink.ml <= 0)
    ) {
      return { ok: false, reason: "ml must be finite and strictly greater than zero" };
    }
    const ethanol = planDrinkEthanol(drink, item);
    if (!Number.isFinite(ethanol) || ethanol < 0) {
      return { ok: false, reason: "ethanol must be finite and non-negative" };
    }
    total += ethanol;
  }

  if (targetEthanolMl > 0 && Math.abs(total - targetEthanolMl) / targetEthanolMl > 0.1) {
    return {
      ok: false,
      reason: `total ${total.toFixed(1)}ml deviates more than 10% from target ${targetEthanolMl.toFixed(1)}ml`,
    };
  }

  return { ok: true, totalEthanolMl: total };
}

function buildUserMessage(req: GeneratePlanRequest): string {
  return [
    `target_ethanol_ml: ${req.target_ethanol_ml.toFixed(1)}`,
    `duration_minutes: ${req.duration_minutes}`,
    `preferences:`,
    `  sweet: ${req.preferences.sweet}`,
    `  strong: ${req.preferences.strong}`,
    `  categories_liked: [${req.preferences.categories_liked.join(", ")}]`,
    `  categories_avoided: [${req.preferences.categories_avoided.join(", ")}]`,
    "",
    "Draft your picks, call calculate_ethanol to verify, then submit_plan.",
  ].join("\n");
}

// OpenAI-format tool definitions
const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "calculate_ethanol",
      description:
        "Check the total ethanol of a draft drink list against the target budget. Call this BEFORE submitting to verify your picks hit the target.",
      parameters: {
        type: "object",
        properties: {
          drinks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                catalog_id: { type: "string" },
                quantity: { type: "number" },
                unit: {
                  type: "string",
                  enum: ["ml", "oz", "shots", "pints", "glass"],
                },
                ml: { type: "number", description: "Optional ml override." },
              },
              required: ["catalog_id", "quantity", "unit"],
            },
          },
        },
        required: ["drinks"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "submit_plan",
      description:
        "Submit the final drinks plan. Only call after calculate_ethanol confirms the total is within range.",
      parameters: {
        type: "object",
        properties: {
          drinks: {
            type: "array",
            description: "Ordered list of drinks the user should consume.",
            items: {
              type: "object",
              properties: {
                catalog_id: { type: "string" },
                quantity: { type: "number" },
                unit: {
                  type: "string",
                  enum: ["ml", "oz", "shots", "pints", "glass"],
                },
                ml: { type: "number" },
              },
              required: ["catalog_id", "quantity", "unit"],
            },
          },
          notes: {
            type: "string",
            description: "One-sentence rationale for the selection.",
          },
        },
        required: ["drinks"],
      },
    },
  },
];

function handleCalculateEthanol(
  args: { drinks: PlanDrink[] },
  catalogById: Map<string, CatalogItem>,
  targetEthanolMl: number
): string {
  let total = 0;
  const breakdown: string[] = [];

  for (const d of args.drinks) {
    const item = catalogById.get(d.catalog_id);
    if (!item) {
      breakdown.push(`${d.catalog_id}: UNKNOWN — not in the available catalog, do not include it in submit_plan`);
      continue;
    }
    const ethanol = planDrinkEthanol(d, item);
    total += ethanol;
    breakdown.push(
      `${d.catalog_id} × ${d.quantity}: ${ethanol.toFixed(1)}ml ethanol`
    );
  }

  const deficit = targetEthanolMl - total;
  const deficitPct = targetEthanolMl > 0 ? (deficit / targetEthanolMl) * 100 : 0;

  let verdict: string;
  if (Math.abs(deficitPct) <= 5) {
    verdict = "GOOD — within ±5% of target. You can submit_plan now.";
  } else if (deficit > 0) {
    verdict = `UNDER by ${deficit.toFixed(1)}ml (${deficitPct.toFixed(0)}%). Add more quantity or another drink, then check again.`;
  } else {
    verdict = `OVER by ${Math.abs(deficit).toFixed(1)}ml (${Math.abs(deficitPct).toFixed(0)}%). Reduce quantity if over by a lot, otherwise acceptable.`;
  }

  return [
    `Target: ${targetEthanolMl.toFixed(1)}ml`,
    `Your total: ${total.toFixed(1)}ml`,
    `Deficit: ${deficit.toFixed(1)}ml (${deficitPct.toFixed(0)}%)`,
    "",
    ...breakdown,
    "",
    verdict,
  ].join("\n");
}

function validateRequest(body: unknown): GeneratePlanRequest | string {
  if (!body || typeof body !== "object") return "Invalid request body";
  const b = body as Record<string, unknown>;

  if (typeof b.target_ethanol_ml !== "number" || b.target_ethanol_ml <= 0) {
    return "target_ethanol_ml must be a positive number";
  }
  if (typeof b.duration_minutes !== "number" || b.duration_minutes <= 0) {
    return "duration_minutes must be a positive number";
  }
  if (!Array.isArray(b.catalog) || b.catalog.length === 0) {
    return "catalog must be a non-empty array";
  }
  if (!b.preferences || typeof b.preferences !== "object") {
    return "preferences is required";
  }

  return body as unknown as GeneratePlanRequest;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
type ChatMessage = { role: string; content?: string; tool_calls?: any[]; tool_call_id?: string };

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
      if (!OPENROUTER_API_KEY) {
        console.error("OPENROUTER_API_KEY not configured");
        return jsonResponse({ error: "AI service not configured" }, 500);
      }

      const body = await req.json();
      const validated = validateRequest(body);
      if (typeof validated === "string") {
        return jsonResponse({ error: validated }, 400);
      }

      console.log(
        `generate-plan: user=${ctx.userClaims?.id} target=${validated.target_ethanol_ml}ml duration=${validated.duration_minutes}min catalog=${validated.catalog.length}`
      );

      // locked_drinks[].catalog_id and exclude[] are server-side control data:
      // their identifiers are removed from every model-visible surface (system
      // prompt catalogue block, user message, tool results and catalogById).
      // The full catalogue is never sent to the model.
      const hiddenIds = new Set<string>([
        ...(validated.locked_drinks ?? []).map((d) => d.catalog_id),
        ...(validated.exclude ?? []),
      ]);
      const visibleCatalog = validated.catalog.filter((c) => !hiddenIds.has(c.id));

      // With nothing eligible left and a positive target, fail cleanly so the
      // client's deterministic greedy fallback handles the request locally.
      if (visibleCatalog.length === 0) {
        console.error(
          `No eligible catalog items after applying locked/exclude filtering (${validated.catalog.length} supplied)`
        );
        return jsonResponse({ error: "No eligible catalog items" }, 422);
      }

      const catalogById = new Map(visibleCatalog.map((c) => [c.id, c]));

      const systemPrompt =
        SYSTEM_INSTRUCTIONS + "\n\n" + buildCatalogBlock(visibleCatalog);

      const messages: ChatMessage[] = [
        { role: "user", content: buildUserMessage(validated) },
      ];

      let plan: PlanResponse | null = null;
      let acceptedEthanolMl = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const apiResponse = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: DEEPSEEK_MODEL,
              messages: [
                { role: "system", content: systemPrompt },
                ...messages,
              ],
              tools: TOOLS,
              tool_choice: "auto",
              max_tokens: 2048,
              provider: {
                only: ["deepseek"],
                allow_fallbacks: false,
                require_parameters: true,
              },
              reasoning: {
                effort: "none",
                exclude: true,
              },
            }),
          }
        );

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          console.error(
            "DeepSeek API error:",
            apiResponse.status,
            errorText
          );
          const status = apiResponse.status === 429 ? 429 : 502;
          return jsonResponse(
            {
              error:
                apiResponse.status === 429
                  ? "Rate limited"
                  : "AI service error",
              details: errorText.slice(0, 200),
            },
            status
          );
        }

        const data = await apiResponse.json();

        if (data.usage) {
          totalInputTokens += data.usage.prompt_tokens ?? 0;
          totalOutputTokens += data.usage.completion_tokens ?? 0;
        }

        const choice = data.choices?.[0];
        if (!choice) {
          console.error("No choices in response:", JSON.stringify(data).slice(0, 500));
          return jsonResponse({ error: "AI returned empty response" }, 502);
        }

        const assistantMsg = choice.message;
        messages.push(assistantMsg);

        const toolCalls = assistantMsg.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
          console.warn(
            `Round ${round}: model responded without tool call (finish_reason=${choice.finish_reason})`
          );
          break;
        }

        for (const tc of toolCalls) {
          const fnName = tc.function?.name;
          let args: Record<string, unknown>;
          try {
            args = JSON.parse(tc.function?.arguments ?? "{}");
          } catch {
            args = {};
          }

          if (fnName === "calculate_ethanol") {
            const result = handleCalculateEthanol(
              args as { drinks: PlanDrink[] },
              catalogById,
              validated.target_ethanol_ml
            );
            console.log(`Round ${round}: calculate_ethanol → ${result.split("\n")[2]}`);
            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: result,
            });
          } else if (fnName === "submit_plan") {
            const submitted = args as unknown as PlanResponse;
            const validation = validateSubmittedPlan(
              submitted,
              catalogById,
              validated.target_ethanol_ml
            );
            if (!validation.ok) {
              console.error(`Rejected submit_plan: ${validation.reason}`);
              return jsonResponse({ error: `Invalid plan: ${validation.reason}` }, 422);
            }
            plan = submitted;
            acceptedEthanolMl = validation.totalEthanolMl;
            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: '{"status": "accepted"}',
            });
            break;
          } else {
            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: `Unknown tool: ${fnName}`,
            });
          }
        }

        if (plan) break;
      }

      console.log(
        `tokens: in=${totalInputTokens} out=${totalOutputTokens} rounds=${messages.filter((m) => m.role === "assistant").length}`
      );

      if (!plan || !Array.isArray(plan.drinks)) {
        console.error("No submit_plan call after all rounds");
        return jsonResponse(
          { error: "AI did not submit a plan after multiple rounds" },
          502
        );
      }

      console.log(
        `plan: drinks=${plan.drinks.length} actual=${acceptedEthanolMl.toFixed(1)}ml target=${validated.target_ethanol_ml.toFixed(1)}ml`
      );

      return jsonResponse({
        drinks: plan.drinks,
        notes: plan.notes ?? "",
        actual_total_ethanol_ml: acceptedEthanolMl,
      } satisfies PlanResponse);
    } catch (error) {
      console.error("Error in generate-plan function:", error);
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Unknown error" },
        500
      );
    }
  }),
};
