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

describe("Custom drinks behave like standard drinks", () => {
  // Keeping a drink on a venue and saving it to the account are one act: the
  // venue copy and the account copy are the same drink, so "both" == "keep it".
  it("saves to the account whenever a drink is kept on a venue", () => {
    expect(source).toContain("(draft.saveToAccount || draft.keepIt)");
  });

  // Where it was picked from decides the panel, so the same drink added from the
  // Cocktails tab and from the Custom drink sheet is two ordinary entries in two
  // panels — never merged.
  it("records a custom row picked from a category screen under that screen", () => {
    const start = source.indexOf("const handleAddSelected");
    const add = source.slice(start, source.indexOf("addUnplannedDrink(entry);", start));

    expect(add).toContain("pickerScreenCategoryFor(selectedDrink.category, selectedDrink.category_label)");
    expect(add).toContain("crypto.randomUUID()");
  });

  it("steps a plan row by that row's own serving, not a category default", () => {
    const start = source.indexOf("const handleStepDrink");
    const step = source.slice(start, source.indexOf("const overCeiling", start));

    expect(step).toContain("const perServing = total / servings;");
    expect(step).toContain("quantity: String(perServing * nextServings)");
    // A stepper must never reach past the same +20% bound the tray enforces.
    expect(step).toContain("targetMl * 1.2");
    // And never edits a consumed row.
    expect(step).toContain("consumedSourceIds.has(entry.id)");
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
