import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const edgeFunction = readFileSync(
  new URL("../../supabase/functions/generate-plan/index.ts", import.meta.url),
  "utf8",
);

describe("generate-plan Edge contract", () => {
  it("shows the model only the locked/excluded-filtered catalogue", () => {
    expect(edgeFunction).toContain("...(validated.locked_drinks ?? []).map((d) => d.catalog_id)");
    expect(edgeFunction).toContain("...(validated.exclude ?? [])");
    expect(edgeFunction).toContain("validated.catalog.filter((c) => !hiddenIds.has(c.id))");
    expect(edgeFunction).toContain("new Map(visibleCatalog.map((c) => [c.id, c]))");
    expect(edgeFunction).toContain("buildCatalogBlock(visibleCatalog)");

    const userMessage = edgeFunction.slice(
      edgeFunction.indexOf("function buildUserMessage"),
      edgeFunction.indexOf("// OpenAI-format tool definitions"),
    );
    expect(userMessage).not.toContain("locked_drinks:");
    expect(userMessage).not.toContain("exclude:");
    expect(edgeFunction).not.toContain("${d.catalog_id}: UNKNOWN");
  });

  // The model is unchanged; only its host moved. DeepSeek's own endpoint is
  // unreachable from this OpenRouter account — a jurisdiction guardrail blocks
  // every CN-headquartered provider (deepseek, baidu, streamlake), which no
  // privacy or ZDR setting overrides. Verified live 2026-08-16 by sweeping all
  // 28 providers serving this model. Decart serves identical weights.
  it("pins V4 Flash to a single reachable provider with reasoning disabled", () => {
    expect(edgeFunction).toContain('const DEEPSEEK_MODEL = "deepseek/deepseek-v4-flash-0731"');
    expect(edgeFunction).toMatch(/provider:\s*{\s*only:\s*\["coreweave",\s*"wafer"\],\s*order:\s*\["coreweave",\s*"wafer"\],\s*allow_fallbacks:\s*true,\s*require_parameters:\s*true,/s);
    // Must be `enabled: false`, never `effort: "none"`: this model advertises
    // supported_efforts ["max","high","low"], and measured live, `effort: "low"`
    // still burned 400 reasoning tokens while `enabled: false` burned 0.
    expect(edgeFunction).toMatch(/reasoning:\s*{\s*enabled:\s*false,/s);
    // Scoped to the request body: the surrounding comment mentions the
    // rejected `effort: "none"` form deliberately.
    expect(edgeFunction).not.toMatch(/reasoning:\s*{\s*effort:/s);
  });

  // Measured 2026-08-16, 30 trials per configuration on CoreWeave: with
  // calculate_ethanol 30/30 plans cleared the ±10% gate (worst deviation ±5%);
  // without it 29/30 cleared (worst −16%). Costs ~1s and ~1.1 extra rounds.
  it("gives the model calculate_ethanol as well as submit_plan", () => {
    const tools = edgeFunction.slice(
      edgeFunction.indexOf("const TOOLS = ["),
      edgeFunction.indexOf("function handleCalculateEthanol"),
    );
    expect(tools.match(/name:\s*"(\w+)"/g)).toEqual([
      'name: "calculate_ethanol"',
      'name: "submit_plan"',
    ]);
    // The server still recomputes every total; model arithmetic is never trusted.
    expect(edgeFunction).toContain("validateSubmittedPlan(");
  });

  // OpenRouter attaches `reasoning`/`reasoning_content` to the assistant
  // message. CoreWeave's deserializer treats them as one field, so replaying
  // the raw message 400s with "duplicate field `reasoning_content`" on every
  // round after the first — which is every multi-tool call.
  it("echoes a sanitised assistant message back into the conversation", () => {
    expect(edgeFunction).not.toMatch(/messages\.push\(assistantMsg\)/);
    expect(edgeFunction).toContain("const echoedMsg: ChatMessage = {");
    expect(edgeFunction).toContain("messages.push(echoedMsg)");
    const echo = edgeFunction.slice(
      edgeFunction.indexOf("const echoedMsg: ChatMessage = {"),
      edgeFunction.indexOf("messages.push(echoedMsg)"),
    );
    expect(echo).not.toContain("reasoning");
  });

  it("rejects the whole malformed or deterministically off-target answer", () => {
    expect(edgeFunction).toContain("if (!Array.isArray(plan.drinks))");
    expect(edgeFunction).toContain("!Number.isFinite(drink.quantity)");
    expect(edgeFunction).toContain("drink.quantity <= 0");
    expect(edgeFunction).toContain("!VALID_UNITS.has(drink.unit)");
    expect(edgeFunction).toContain("Number.isFinite(drink.ml) && drink.ml > 0");
    expect(edgeFunction).toContain("Math.abs(total - targetEthanolMl) / targetEthanolMl > 0.1");
    expect(edgeFunction).toContain("return jsonResponse({ error: `Invalid plan: ${validation.reason}` }, 422)");
    expect(edgeFunction).not.toContain("cleanedDrinks");
    expect(Math.abs(90 - 100) / 100 > 0.1).toBe(false);
    expect(Math.abs(110 - 100) / 100 > 0.1).toBe(false);
    expect(Math.abs(89.9 - 100) / 100 > 0.1).toBe(true);
    expect(Math.abs(110.1 - 100) / 100 > 0.1).toBe(true);
  });

  // A custom volume is a serving the USER names. A model free to pick any ml
  // invents servings nobody sells, at prices nobody set.
  it("honours an ml override only when it names the catalogue serving", () => {
    expect(edgeFunction).toContain("Math.abs(drink.ml - item.typical_ml) > 0.01");
    expect(edgeFunction).toContain("delete drink.ml");
    // Dropped, not rejected: the item counts at its catalogue serving and the
    // recomputed total still faces the same gate.
    expect(edgeFunction).toContain("const serving = drink.ml ?? item.typical_ml");
  });
});
