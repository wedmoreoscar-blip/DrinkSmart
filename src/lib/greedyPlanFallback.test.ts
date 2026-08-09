import { describe, expect, it } from "vitest";
import type { CatalogItem } from "@/lib/planCatalog";
import type { GeneratePlanInput, LockedDrink } from "@/lib/generatePlan";
import { greedyPlanFallback } from "@/lib/greedyPlanFallback";

const CATALOG: CatalogItem[] = [
  { id: "cocktails::Espresso Martini", name: "Espresso Martini", abv: 15, typical_ml: 250, category: "cocktails" },
  { id: "beer_pint::Stella Artois", name: "Stella Artois", abv: 4.8, typical_ml: 568, category: "beer_pint" },
  { id: "wine_red::Merlot", name: "Merlot", abv: 13, typical_ml: 175, category: "wine_red" },
  { id: "vodka::Absolut", name: "Absolut", abv: 40, typical_ml: 25, category: "vodka" },
];

const PREFERENCES = {
  sweet: 0.5,
  strong: 0.5,
  categories_liked: [],
  categories_avoided: [],
};

// A kept drink outside the catalog: the caller already subtracted its 15 ml,
// so the request budget is 45 ml and the fallback must plan against 45.
const KEPT_OUTSIDE_CATALOG: LockedDrink[] = [
  { catalog_id: "custom::kept", quantity: 1, unit: "shots", ethanol_ml: 15 },
];

const KEPT_IN_CATALOG: LockedDrink[] = [
  { catalog_id: "cocktails::Espresso Martini", quantity: 1, unit: "ml", ethanol_ml: 37.5 },
];

function request(overrides: Partial<GeneratePlanInput> = {}): GeneratePlanInput {
  return {
    target_ethanol_ml: 45,
    duration_minutes: 180,
    preferences: PREFERENCES,
    catalog: CATALOG,
    ...overrides,
  };
}

describe("greedyPlanFallback budget contract", () => {
  it("plans against the 45 ml remaining budget when a kept drink contributes 15 ml of a 60 ml target", () => {
    const withLocked = greedyPlanFallback(request({ locked_drinks: KEPT_OUTSIDE_CATALOG }));
    // Explicit hand-derived expectation for a 45 ml budget:
    // Espresso Martini (250 ml × 15% = 37.5 ml) is the only candidate within
    // the 1.1× cap; no remaining candidate fits after it.
    expect(withLocked.drinks).toEqual([
      { catalog_id: "cocktails::Espresso Martini", quantity: 1, unit: "ml", ml: 250 },
    ]);
    const totalEthanol = 250 * 0.15;
    expect(totalEthanol).toBeCloseTo(37.5, 10);
  });

  it("produces the same result whether the informational locked_drinks array is present or absent", () => {
    const withLocked = greedyPlanFallback(request({ locked_drinks: KEPT_OUTSIDE_CATALOG }));
    const withoutLocked = greedyPlanFallback(request({ locked_drinks: undefined }));
    const withEmptyLocked = greedyPlanFallback(request({ locked_drinks: [] }));
    expect(withLocked).toEqual(withoutLocked);
    expect(withLocked).toEqual(withEmptyLocked);
    expect(withLocked.notes).toBe(
      "Built offline from your catalog. 1 drink, lighter to start."
    );
  });

  it("does not re-include a locked drink that is in the catalog", () => {
    const plan = greedyPlanFallback(request({ locked_drinks: KEPT_IN_CATALOG }));
    expect(plan.drinks.some((d) => d.catalog_id === "cocktails::Espresso Martini")).toBe(false);
    expect(plan.drinks.map((d) => d.catalog_id)).toEqual([
      "beer_pint::Stella Artois",
      "vodka::Absolut",
    ]);
  });

  it("ignores non-finite locked ethanol values", () => {
    const broken: LockedDrink[] = [
      { catalog_id: "custom::kept", quantity: 1, unit: "shots", ethanol_ml: NaN },
    ];
    expect(greedyPlanFallback(request({ locked_drinks: broken }))).toEqual(
      greedyPlanFallback(request({ locked_drinks: undefined }))
    );
  });
});

describe("greedyPlanFallback boundary budgets", () => {
  it("returns an empty plan for a zero remaining budget", () => {
    const plan = greedyPlanFallback(request({ target_ethanol_ml: 0 }));
    expect(plan.drinks).toEqual([]);
    expect(plan.notes).toBe(
      "No catalog items fit your budget — try a longer duration or adjust preferences."
    );
  });

  it("returns an empty plan for a negative remaining budget", () => {
    const plan = greedyPlanFallback(request({ target_ethanol_ml: -10 }));
    expect(plan.drinks).toEqual([]);
  });

  it("returns an empty plan for a NaN remaining budget", () => {
    const plan = greedyPlanFallback(request({ target_ethanol_ml: NaN }));
    expect(plan.drinks).toEqual([]);
  });

  it("never produces negative, NaN, or infinite ethanol in its picks", () => {
    const budgets = [0, 0.5, 45, NaN, Infinity, -5];
    for (const budget of budgets) {
      const plan = greedyPlanFallback(request({ target_ethanol_ml: budget }));
      for (const drink of plan.drinks) {
        expect(drink.quantity).toBeGreaterThan(0);
        expect(Number.isFinite(drink.quantity)).toBe(true);
        if (drink.ml !== undefined) {
          expect(Number.isFinite(drink.ml)).toBe(true);
          expect(drink.ml).toBeGreaterThan(0);
        }
      }
    }
  });
});
