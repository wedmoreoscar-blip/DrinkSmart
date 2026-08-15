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

  it("pins V4 Flash to DeepSeek's provider with reasoning disabled", () => {
    expect(edgeFunction).toContain('const DEEPSEEK_MODEL = "deepseek/deepseek-v4-flash-0731"');
    expect(edgeFunction).toMatch(/provider:\s*{\s*only:\s*\["deepseek"\],\s*allow_fallbacks:\s*false,\s*require_parameters:\s*true,/s);
    expect(edgeFunction).toMatch(/reasoning:\s*{\s*effort:\s*"none",\s*exclude:\s*true,/s);
  });

  it("rejects the whole malformed or deterministically off-target answer", () => {
    expect(edgeFunction).toContain("if (!Array.isArray(plan.drinks))");
    expect(edgeFunction).toContain("!Number.isFinite(drink.quantity)");
    expect(edgeFunction).toContain("drink.quantity <= 0");
    expect(edgeFunction).toContain("!VALID_UNITS.has(drink.unit)");
    expect(edgeFunction).toContain("!Number.isFinite(drink.ml)");
    expect(edgeFunction).toContain("Math.abs(total - targetEthanolMl) / targetEthanolMl > 0.1");
    expect(edgeFunction).toContain("return jsonResponse({ error: `Invalid plan: ${validation.reason}` }, 422)");
    expect(edgeFunction).not.toContain("cleanedDrinks");
    expect(Math.abs(90 - 100) / 100 > 0.1).toBe(false);
    expect(Math.abs(110 - 100) / 100 > 0.1).toBe(false);
    expect(Math.abs(89.9 - 100) / 100 > 0.1).toBe(true);
    expect(Math.abs(110.1 - 100) / 100 > 0.1).toBe(true);
  });
});
