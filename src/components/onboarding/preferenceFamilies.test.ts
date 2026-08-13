import { describe, expect, it } from "vitest";
import { PREFERENCE_FAMILIES } from "./preferenceFamilies";
import { preferenceCategoryKeys } from "@/lib/preferences";

// Derived from W4-3 amendment 1, clause 4a. The amendment exists because the
// original spec said "six chips from preferenceCategoryKeys" while that constant
// yields eighteen keys -- so the mapping is the whole point of the clause and the
// thing most likely to drift.
describe("PREFERENCE_FAMILIES (Wave 5)", () => {
  it("renders the five authoritative families in order", () => {
    expect(PREFERENCE_FAMILIES.map((f) => f.label)).toEqual([
      "Beer & cider",
      "Wine",
      "Spirits",
      "Cocktails",
      "Low & no",
    ]);
  });

  it("covers every real category key, so no preference is silently dropped", () => {
    const covered = PREFERENCE_FAMILIES.flatMap((f) => f.keys);
    expect([...covered].sort()).toEqual([...preferenceCategoryKeys].sort());
  });

  it("never maps one key into two families, which would make a chip ambiguous", () => {
    const covered = PREFERENCE_FAMILIES.flatMap((f) => f.keys);
    expect(covered.length).toBe(new Set(covered).size);
  });

  it("maps each family to the keys the amendment names", () => {
    const byLabel = Object.fromEntries(PREFERENCE_FAMILIES.map((f) => [f.label, f.keys]));
    expect(byLabel["Beer & cider"]).toEqual(["beer_pint", "beer_bottle", "cider"]);
    expect(byLabel.Wine).toEqual(["wine_red", "wine_white", "wine_rose", "wine_sparkling"]);
    // `alcopops` was missing from the amendment's table and is corrected into
    // Cocktails; the coverage assertion above is what surfaced it.
    expect(byLabel.Cocktails).toEqual(["cocktails", "spritz", "alcopops"]);
    expect(byLabel.Spirits).toEqual(
      expect.arrayContaining(["gin", "vodka", "rum", "whiskey", "tequila", "brandy", "liqueurs", "shots"]),
    );
  });

  // Clause 4b. A non-alcoholic category must not be invented: a 0% ABV entry
  // contributes no ethanol, takes 0% of target and 0 minutes, and clusters at t=0.
  it("gives 'Low & no' no keys at all, since no such category may exist", () => {
    const lowNo = PREFERENCE_FAMILIES.find((f) => f.label === "Low & no");
    expect(lowNo?.keys).toEqual([]);
  });

  it("does not introduce a key the catalog has never heard of", () => {
    const known = new Set(preferenceCategoryKeys);
    for (const family of PREFERENCE_FAMILIES) {
      for (const key of family.keys) expect(known.has(key)).toBe(true);
    }
  });
});
