import { describe, expect, it } from "vitest";
import type { AlcoholTimelineEntryInput } from "@/lib/sessionEngine";
import { isSamePlannedDrink, mergePlanDuplicates, perServingMl, withServings } from "./planMerge";

const pick = (
  over: Partial<AlcoholTimelineEntryInput> & { quantity: string },
): AlcoholTimelineEntryInput => ({
  id: Math.random().toString(36).slice(2),
  category: "cocktails",
  drink: "Long Island Iced Tea",
  unit: "ml",
  ...over,
});

const always = () => true;

describe("isSamePlannedDrink", () => {
  it("merges the same drink at the same per-serving volume", () => {
    expect(
      isSamePlannedDrink(pick({ quantity: "250" }), pick({ quantity: "750", portions: 3 })),
    ).toBe(true);
  });

  // The rule is the volume, not the serving's name: a 330 ml row reached through
  // "DB volume" and through "Standard" is one drink.
  it("merges two servings that resolve to the same volume under different names", () => {
    const viaDatabase = pick({ quantity: "330", drink: "Cocktail can" });
    const viaStandard = pick({ quantity: "330", drink: "Cocktail can" });
    expect(isSamePlannedDrink(viaDatabase, viaStandard)).toBe(true);
  });

  it("keeps a pint and a half pint apart", () => {
    const pint = pick({ quantity: "568", drink: "Carling", category: "beer_pint" });
    const half = pick({ quantity: "284", drink: "Carling", category: "beer_pint" });
    expect(isSamePlannedDrink(pint, half)).toBe(false);
  });

  it("keeps a single and a double apart", () => {
    const single = pick({ quantity: "25", drink: "Gordon's", category: "gin" });
    const double = pick({ quantity: "50", drink: "Gordon's", category: "gin" });
    expect(isSamePlannedDrink(single, double)).toBe(false);
  });

  // Origin is a deliberate choice: the same drink from the Custom drink sheet and
  // from a category tab stays as two entries in two panels.
  it("keeps a custom-sheet pick apart from a category-tab pick", () => {
    const fromSheet = pick({
      quantity: "90",
      drink: "",
      isCustom: true,
      customName: "House negroni",
      category: "Cocktails",
    });
    const fromTab = pick({ quantity: "90", drink: "House negroni", category: "Cocktails" });
    expect(isSamePlannedDrink(fromSheet, fromTab)).toBe(false);
  });

  it("keeps the same name in different categories apart", () => {
    const a = pick({ quantity: "250", category: "cocktails" });
    const b = pick({ quantity: "250", category: "spritz" });
    expect(isSamePlannedDrink(a, b)).toBe(false);
  });
});

describe("perServingMl", () => {
  it("divides the total by the serving count", () => {
    expect(perServingMl(pick({ quantity: "750", portions: 3 }))).toBe(250);
    expect(perServingMl(pick({ quantity: "250" }))).toBe(250);
  });

  it("is null for a non-ml or unusable entry", () => {
    expect(perServingMl(pick({ quantity: "2", unit: "pints" }))).toBeNull();
    expect(perServingMl(pick({ quantity: "0" }))).toBeNull();
    expect(perServingMl(pick({ quantity: "" }))).toBeNull();
  });
});

describe("withServings", () => {
  it("scales the total and drops portions back to undefined at one", () => {
    const three = withServings(pick({ quantity: "250" }), 3);
    expect(three.quantity).toBe("750");
    expect(three.portions).toBe(3);

    const one = withServings(three, 1);
    expect(one.quantity).toBe("250");
    expect(one.portions).toBeUndefined();
  });
});

describe("mergePlanDuplicates", () => {
  it("folds a second pick into the first and keeps order", () => {
    const first = pick({ quantity: "750", portions: 3, id: "a" });
    const other = pick({ quantity: "568", drink: "Carling", category: "beer_pint", id: "b" });
    const second = pick({ quantity: "750", portions: 3, id: "c" });

    const merged = mergePlanDuplicates([first, other, second], always);

    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe("a");
    expect(merged[0].portions).toBe(6);
    expect(merged[0].quantity).toBe("1500");
    expect(merged[1].id).toBe("b");
  });

  // A consumed drink is history: it must never absorb a new pick, nor be folded
  // into one, or the record of what was actually drunk changes.
  it("never moves an entry it is told it cannot merge", () => {
    const consumed = pick({ quantity: "250", id: "consumed" });
    const fresh = pick({ quantity: "250", id: "fresh" });

    const merged = mergePlanDuplicates([consumed, fresh], (entry) => entry.id !== "consumed");

    expect(merged).toHaveLength(2);
    expect(merged[0].quantity).toBe("250");
    expect(merged[1].id).toBe("fresh");
  });

  it("leaves an already-tidy plan untouched", () => {
    const entries = [
      pick({ quantity: "250", id: "a" }),
      pick({ quantity: "568", drink: "Carling", category: "beer_pint", id: "b" }),
    ];
    expect(mergePlanDuplicates(entries, always)).toEqual(entries);
  });
});
