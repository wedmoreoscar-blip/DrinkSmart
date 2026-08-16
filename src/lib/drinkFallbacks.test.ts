import { describe, expect, it } from "vitest";

import { classifyDrink, fallbackAbv, fallbackServeMl } from "@/lib/drinkFallbacks";

describe("menu scanner deterministic drink fallbacks", () => {
  it.each([
    ["lager", "Lager", "beer", 5, 568],
    ["cider", "Cider", "beer", 5, 568],
    ["red-wine", "Red wine", "wine", 13, 175],
    ["shots", "Tequila shot", "spirit", 40, 25],
    ["cocktails", "House cocktail", "cocktail", 15, 250],
    ["soft-drinks", "Soft drink", "soft", 0, 330],
    ["no-alcohol", "Alcohol-free beer", "soft", 0, 330],
    ["low-alcohol", "Low alcohol", "low", 1.2, 330],
    ["alcopops", "Alcopop", "alcopop", 4, 330],
    ["rtd", "Ready-to-drink", "alcopop", 4, 330],
  ] as const)(
    "classifies %s independently and supplies its locked fallback row",
    (category, label, classification, abv, serveMl) => {
      expect(classifyDrink(category, label)).toBe(classification);
      expect(fallbackAbv(category, label)).toBe(abv);
      expect(fallbackServeMl(category, label)).toBe(serveMl);
    },
  );

  it("does not mistake an ordinary percentage ending in zero for explicit 0% alcohol", () => {
    expect(classifyDrink("unknown", "House drink 10% ABV")).toBe("unknown");
    expect(classifyDrink("spirits", "Vodka 40% ABV")).toBe("spirit");
  });

  it("uses a non-zero conservative fallback when no classification is readable", () => {
    expect(fallbackAbv(null, null)).toBe(15);
    expect(fallbackServeMl(null, null)).toBe(330);
  });
});
