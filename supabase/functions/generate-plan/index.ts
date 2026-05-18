import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";

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
}

const SYSTEM_INSTRUCTIONS = `You are a drink planning assistant for the DrinkSmart app.

You will receive:
- A pure-ethanol budget in mL (target_ethanol_ml) — the total alcohol the user should consume
- A drinking duration in minutes
- Per-call user preferences (sweet 0-1, strong 0-1, categories liked/avoided)
- A catalog of available drinks (id, name, abv, typical_ml, category)
- Locked drinks already chosen (their ethanol is already subtracted from the budget — DO NOT re-include them)
- An exclude list of catalog_ids you must avoid

Your job: select drinks from the catalog whose summed ethanol approximately equals target_ethanol_ml (±10%), and order them.

Hard rules:
- Pick only from the provided catalog. NEVER invent drinks or ABVs. Use exact catalog_id values.
- Do not pick any drink whose category appears in preferences.categories_avoided.
- Do not pick any catalog_id appearing in the exclude list.
- For each chosen drink, set quantity and unit. typical_ml in the catalog tells you the default serving — for "ml"/"oz" units include an "ml" override only if you want a non-default size.
- Pick a reasonable number of drinks for the duration (rule of thumb: 1 drink per 30–60 min).

Ordering: lighter drinks earlier, the heaviest in the middle third of the plan, taper toward the end. This is a soft rule, use judgement.

Selection bias from preferences (soft):
- preferences.sweet near 1 → favour sweeter drinks (cocktails, alcopops, dessert wines)
- preferences.sweet near 0 → favour dry drinks (dry wines, beers, neat spirits)
- preferences.strong near 1 → favour higher ABV drinks (spirits, shots, fortified wine)
- preferences.strong near 0 → favour lower ABV drinks (beers, ciders, low-ABV cocktails)
- categories_liked → boost these
- categories_avoided → exclude entirely (hard rule above)

Always invoke the submit_plan tool to return your selection. Do not respond with plain text.`;

function buildCatalogBlock(catalog: CatalogItem[]): string {
  return [
    "Drink catalog (id | name | abv% | typical_ml | category):",
    ...catalog.map(
      (c) => `${c.id} | ${c.name} | ${c.abv}% | ${c.typical_ml}ml | ${c.category}`
    ),
  ].join("\n");
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
    },
    required: ["drinks"],
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check — any Supabase session (anonymous OK), prevents open abuse
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const validated = validateRequest(body);
    if (typeof validated === "string") {
      return new Response(
        JSON.stringify({ error: validated }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(
      `generate-plan: user=${user.id} target=${validated.target_ethanol_ml}ml duration=${validated.duration_minutes}min catalog=${validated.catalog.length}`
    );

    // System: static instructions + catalog (cached). The cache breakpoint goes on the
    // catalog block — that block and everything before it forms the cache key.
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
      return new Response(
        JSON.stringify({
          error:
            anthropicResponse.status === 429
              ? "Rate limited"
              : "AI service error",
          details: errorText.slice(0, 200),
        }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await anthropicResponse.json();

    // Log cache hit metrics for cost tracking
    if (data.usage) {
      console.log(
        `tokens: in=${data.usage.input_tokens} out=${data.usage.output_tokens} cache_read=${data.usage.cache_read_input_tokens ?? 0} cache_create=${data.usage.cache_creation_input_tokens ?? 0}`
      );
    }

    // Extract the tool_use block
    const toolUseBlock = Array.isArray(data.content)
      ? data.content.find(
          (block: { type?: string; name?: string }) =>
            block.type === "tool_use" && block.name === "submit_plan"
        )
      : null;

    if (!toolUseBlock?.input) {
      console.error("No submit_plan tool_use block in response:", JSON.stringify(data).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "AI returned unexpected response shape" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const plan = toolUseBlock.input as PlanResponse;

    // Hard validation: drop any drinks whose catalog_id isn't in the provided catalog
    const validIds = new Set(validated.catalog.map((c) => c.id));
    const cleanedDrinks = (plan.drinks ?? []).filter((d) => validIds.has(d.catalog_id));

    if (cleanedDrinks.length !== (plan.drinks ?? []).length) {
      console.warn(
        `Dropped ${(plan.drinks ?? []).length - cleanedDrinks.length} drinks with unknown catalog_ids`
      );
    }

    const result: PlanResponse = {
      drinks: cleanedDrinks,
      notes: plan.notes ?? "",
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-plan function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
