import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./DrinksTab.tsx", import.meta.url), "utf8");

describe("Plan drink-card action invariant", () => {
  it("filters only the rendered-card collection while totals keep the full plan", () => {
    expect(source).toContain("filterActionablePlanEntries(planEntries, consumedSourceIds)");
    expect(source).toContain("planEntries.reduce((total, entry) => total + entryEthanolMl");
    expect(source).toContain("for (const entry of unconsumedEntries)");
  });

  it("has no conditional icon-suppression path inside panelRow", () => {
    const start = source.indexOf("const panelRow");
    const panelRow = source.slice(start, source.indexOf("  return (", start));

    expect(panelRow).not.toContain("consumedSourceIds");
    expect(panelRow).toContain('aria-label={state.lockedDrinkIds.includes(entry.id) ? "Unlock" : "Lock"}');
    expect(panelRow).toContain('aria-label="Delete"');
  });
});
