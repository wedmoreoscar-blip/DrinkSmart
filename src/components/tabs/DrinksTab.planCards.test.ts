import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pickerCategoryFor } from "@/components/picker/picker-copy";

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

describe("Unmapped-category plan entries stay visible", () => {
  // A drink kept via "keep it" is stored with category "custom", and
  // handleAddSelected does not set isCustom on the entry it builds.
  it("maps kept custom/other venue categories to no picker category", () => {
    expect(pickerCategoryFor("custom", "Other")).toBeNull();
    expect(pickerCategoryFor("custom", null)).toBeNull();
    expect(pickerCategoryFor("", null)).toBeNull();
    expect(pickerCategoryFor("beer", null)).toBe("Beer & cider");
  });

  it("routes those entries to the Custom drink panel instead of dropping them", () => {
    const start = source.indexOf("const planGroups = useMemo");
    const grouping = source.slice(start, source.indexOf("return groups;", start));

    // Falls back to the Custom drink panel rather than skipping the entry: a
    // dropped entry still counts toward ethanol/BAC but renders in no panel,
    // leaving it with no lock or delete control anywhere in the Plan tab.
    expect(grouping).toContain(
      "pickerCategoryFor(entry.category, null) ?? PICKER_COPY.customCategory.name",
    );
    expect(grouping).not.toContain("if (!label) continue;");
  });
});
