import { withSupabase } from "@supabase/server";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";

// CORS headers — Supabase's withSupabase wrapper handles auth; we still emit
// CORS headers on responses so browser callers from `supabase.functions.invoke`
// land correctly.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
- A catalog of available drinks. Each row gives (id | name | abv% | typical_ml | ethanol_ml | category) where ethanol_ml is the pure-ethanol contribution of ONE typical serving — already computed for you. Sum the ethanol_ml column for your picks; do not re-derive from abv and typical_ml.
- Locked drinks already chosen (their ethanol is already subtracted from the budget — DO NOT re-include them)
- An exclude list of catalog_ids you must avoid

Your job: select drinks from the catalog so that summed ethanol_ml × quantity reaches target_ethanol_ml (aim within ±5%, never undershoot by more than 10%), and order them.

Filling the budget is the highest priority. The user picked a target BAC — if the plan undershoots, they don't reach it. Add another quantity or another drink rather than stopping short.

Variety rule (people stick to a few drinks):
- Prefer 1–2 distinct catalog items per session. Increase the quantity of an existing pick before introducing a new catalog item.
- Only branch beyond 2 distinct items when ANY of: duration_minutes > 240, preferences.categories_liked has ≥3 entries, or target_ethanol_ml > 80.
- Even then cap at 3 distinct items unless the user clearly signalled variety via a long categories_liked list.

Hard rules:
- Pick only from the provided catalog. NEVER invent drinks or ABVs. Use exact catalog_id values.
- Do not pick any drink whose category appears in preferences.categories_avoided.
- Do not pick any catalog_id appearing in the exclude list.
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

Before submitting: add up ethanol_ml × quantity across your picks and put the total in actual_total_ethanol_ml. If it's under target_ethanol_ml by more than 10%, increase a quantity or add one more drink before submitting.

Always invoke the submit_plan tool to return your selection. Do not respond with plain text.`;

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

function buildUserMessage(req: GeneratePlanRequest): string {
  const lockedSummary =
    req.locked_drinks && req.locked_drinks.length > 0
      ? req.locked_drinks
          .map(
            (l) =>
              `${l.catalog_id} (${l.quantity} ${l.unit}, ${l.ethanol_ml.toFixed(1)}ml ethanol)`
          )
          .join(", ")
      : "none";

  const excludeSummary =
    req.exclude && req.exclude.length > 0 ? req.exclude.join(", ") : "none";

  return [
    `target_ethanol_ml: ${req.target_ethanol_ml.toFixed(1)}`,
    `duration_minutes: ${req.duration_minutes}`,
    `preferences:`,
    `  sweet: ${req.preferences.sweet}`,
    `  strong: ${req.preferences.strong}`,
    `  categories_liked: [${req.preferences.categories_liked.join(", ")}]`,
    `  categories_avoided: [${req.preferences.categories_avoided.join(", ")}]`,
    `locked_drinks: ${lockedSummary}`,
    `exclude: ${excludeSummary}`,
    "",
    "Return your plan via the submit_plan tool.",
  ].join("\n");
}

const SUBMIT_PLAN_TOOL = {
  name: "submit_plan",
  description: "Submit the chosen drinks plan as a structured list.",
  input_schema: {
    type: "object",
    properties: {
      drinks: {
        type: "array",
        description: "Ordered list of drinks the user should consume.",
        items: {
          type: "object",
          properties: {
            catalog_id: {
              type: "string",
              description: "The id of a drink from the provided catalog.",
            },
            quantity: {
              type: "number",
              description:
                "How many of this drink. For shots/pints/glass: count. For ml/oz: typically 1 unless splitting into portions.",
            },
            unit: {
              type: "string",
              enum: ["ml", "oz", "shots", "pints", "glass"],
              description: "Serving unit.",
            },
            ml: {
              type: "number",
              description:
                "Optional explicit ml override for ml/oz units. Omit to use the catalog typical_ml.",
            },
          },
          required: ["catalog_id", "quantity", "unit"],
        },
      },
      notes: {
        type: "string",
        description: "One-sentence rationale for the ordering and selection.",
      },
      actual_total_ethanol_ml: {
        type: "number",
        description:
          "Your computed sum of ethanol_ml × quantity across all drinks. Used to verify the plan hits the budget.",
      },
    },
    required: ["drinks", "actual_total_ethanol_ml"],
  },
};

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

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    // Auth has already been verified by the wrapper. ctx.userClaims is the
    // caller (anonymous users have userClaims with is_anonymous = true).
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
      if (!ANTHROPIC_API_KEY) {
        console.error("ANTHROPIC_API_KEY not configured");
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

      // System prompt: static instructions + catalog. The catalog block carries
      // `cache_control` so it (plus everything before it) gets cached across
      // calls — usually >90% cost reduction on the catalog after the first hit.
      const systemBlocks = [
        { type: "text", text: SYSTEM_INSTRUCTIONS },
        {
          type: "text",
          text: buildCatalogBlock(validated.catalog),
          cache_control: { type: "ephemeral" },
        },
      ];

      const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": ANTHROPIC_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 1024,
          system: systemBlocks,
          tools: [SUBMIT_PLAN_TOOL],
          tool_choice: { type: "tool", name: "submit_plan" },
          messages: [
            {
              role: "user",
              content: buildUserMessage(validated),
            },
          ],
        }),
      });

      if (!anthropicResponse.ok) {
        const errorText = await anthropicResponse.text();
        console.error("Anthropic API error:", anthropicResponse.status, errorText);
        const status = anthropicResponse.status === 429 ? 429 : 502;
        return jsonResponse(
          {
            error: anthropicResponse.status === 429 ? "Rate limited" : "AI service error",
            details: errorText.slice(0, 200),
          },
          status
        );
      }

      const data = await anthropicResponse.json();

      if (data.usage) {
        console.log(
          `tokens: in=${data.usage.input_tokens} out=${data.usage.output_tokens} cache_read=${data.usage.cache_read_input_tokens ?? 0} cache_create=${data.usage.cache_creation_input_tokens ?? 0}`
        );
      }

      const toolUseBlock = Array.isArray(data.content)
        ? data.content.find(
            (block: { type?: string; name?: string }) =>
              block.type === "tool_use" && block.name === "submit_plan"
          )
        : null;

      if (!toolUseBlock?.input) {
        console.error(
          "No submit_plan tool_use block in response:",
          JSON.stringify(data).slice(0, 500)
        );
        return jsonResponse({ error: "AI returned unexpected response shape" }, 502);
      }

      const plan = toolUseBlock.input as PlanResponse;

      // Drop any drinks whose catalog_id isn't in the provided catalog.
      const catalogById = new Map(validated.catalog.map((c) => [c.id, c]));
      const cleanedDrinks = (plan.drinks ?? []).filter((d) => catalogById.has(d.catalog_id));

      if (cleanedDrinks.length !== (plan.drinks ?? []).length) {
        console.warn(
          `Dropped ${(plan.drinks ?? []).length - cleanedDrinks.length} drinks with unknown catalog_ids`
        );
      }

      // Recompute actual ethanol server-side — never trust the model's arithmetic.
      const actualTotalEthanolMl = cleanedDrinks.reduce(
        (sum, d) => sum + planDrinkEthanol(d, catalogById.get(d.catalog_id)!),
        0
      );

      const deficitPct =
        validated.target_ethanol_ml > 0
          ? (validated.target_ethanol_ml - actualTotalEthanolMl) / validated.target_ethanol_ml
          : 0;

      console.log(
        `plan: drinks=${cleanedDrinks.length} actual=${actualTotalEthanolMl.toFixed(1)}ml target=${validated.target_ethanol_ml.toFixed(1)}ml deficit=${(deficitPct * 100).toFixed(1)}% model_claimed=${plan.actual_total_ethanol_ml ?? "n/a"}`
      );

      return jsonResponse({
        drinks: cleanedDrinks,
        notes: plan.notes ?? "",
        actual_total_ethanol_ml: actualTotalEthanolMl,
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
