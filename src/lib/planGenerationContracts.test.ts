import { describe, expect, it } from "vitest";
import type { CatalogItem } from "@/lib/planCatalog";
import type { GeneratePlanInput, LockedDrink } from "@/lib/generatePlan";
import {
  computeRegenerationBudget,
  computeRemainingBudget,
  lockedDrinkEntries,
  lockedEthanolTotal,
  requestFingerprint,
  resolvePlanningWindow,
  type LockedDrinkSource,
} from "@/lib/planGenerationContracts";
import type { ConsumedSnapshot, TimelineEntry } from "@/lib/sessionEngine";

const CATALOG: CatalogItem[] = [
  { id: "beer_pint::Guinness", name: "Guinness", abv: 4.1, typical_ml: 568, category: "beer_pint" },
  { id: "wine_red::Merlot", name: "Merlot", abv: 13, typical_ml: 175, category: "wine_red" },
  { id: "vodka::Absolut", name: "Absolut", abv: 40, typical_ml: 25, category: "vodka" },
];

const PREFERENCES = {
  sweet: 0.5,
  strong: 0.5,
  categories_liked: [],
  categories_avoided: [],
};

function baseRequest(overrides: Partial<GeneratePlanInput> = {}): GeneratePlanInput {
  return {
    target_ethanol_ml: 45,
    duration_minutes: 180,
    preferences: PREFERENCES,
    catalog: CATALOG,
    ...overrides,
  };
}

describe("computeRemainingBudget", () => {
  it("subtracts locked ethanol from the total target", () => {
    expect(computeRemainingBudget(60, 15)).toBe(45);
  });

  it("returns the full target when nothing is locked", () => {
    expect(computeRemainingBudget(60, 0)).toBe(60);
  });

  it("clamps to zero when kept ethanol exceeds the target", () => {
    expect(computeRemainingBudget(30, 45)).toBe(0);
    expect(computeRemainingBudget(60, 60)).toBe(0);
    expect(computeRemainingBudget(0, 0)).toBe(0);
  });

  it("never returns a negative, NaN, or infinite budget", () => {
    const cases: Array<[number, number]> = [
      [NaN, 0],
      [60, Infinity],
      [Infinity, 60],
      [-5, 0],
      [10, -3],
      [NaN, NaN],
    ];
    for (const [target, locked] of cases) {
      const budget = computeRemainingBudget(target, locked);
      expect(Number.isFinite(budget)).toBe(true);
      expect(budget).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("computeRegenerationBudget", () => {
  const alcohol = (
    entryId: string,
    drinkId: string,
    pureAlcoholMl: number,
  ): TimelineEntry => ({
    kind: "alcohol",
    entryId,
    drinkId,
    drinkName: drinkId,
    unitNumber: 1,
    totalUnits: 2,
    time: new Date(60_000),
    pureAlcoholMl,
    percentageOfTarget: 20,
    icon: "",
    unit: "ml",
    intervalMinutes: 20,
  });

  it("subtracts consumed ethanol and the unconsumed remainder of that protected source once", () => {
    const timeline = [
      alcohol("A:unit:1", "A", 10),
      alcohol("A:unit:2", "A", 10),
      alcohol("B:unit:1", "B", 30),
    ];
    const consumedSnapshots: ConsumedSnapshot[] = [
      {
        entryId: "A:unit:1",
        sourceDrinkId: "A",
        consumedAt: new Date(0),
        pureAlcoholMl: 10,
      },
    ];

    expect(
      computeRegenerationBudget({
        targetEthanolMl: 60,
        timeline,
        consumedSnapshots,
        lockedDrinkIds: [],
        now: new Date(0),
      }),
    ).toBe(40);
  });
});

describe("lockedDrinkEntries", () => {
  it("builds an entry for a locked pint using catalog ABV and client conversion", () => {
    const drinks: LockedDrinkSource[] = [
      { id: "a", category: "beer_pint", drink: "Guinness", quantity: "2", unit: "pints" },
    ];
    const entries = lockedDrinkEntries(drinks, ["a"], CATALOG);
    expect(entries).toHaveLength(1);
    expect(entries[0].catalog_id).toBe("beer_pint::Guinness");
    expect(entries[0].quantity).toBe(2);
    expect(entries[0].unit).toBe("pints");
    expect(entries[0].ethanol_ml).toBeCloseTo(2 * 568 * 0.041, 9);
  });

  it("uses the custom ABV for custom drinks", () => {
    const drinks: LockedDrinkSource[] = [
      {
        id: "b",
        category: "custom",
        drink: "House Special",
        customName: "House Special",
        isCustom: true,
        customABV: "30",
        quantity: "1",
        unit: "shots",
      },
    ];
    const entries = lockedDrinkEntries(drinks, ["b"], CATALOG);
    expect(entries).toEqual([
      { catalog_id: "custom::House Special", quantity: 1, unit: "shots", ethanol_ml: 9 },
    ]);
  });

  it("converts ounces through OZ_ML", () => {
    const drinks: LockedDrinkSource[] = [
      { id: "c", category: "vodka", drink: "Absolut", quantity: "2", unit: "oz" },
    ];
    const entries = lockedDrinkEntries(drinks, ["c"], CATALOG);
    expect(entries[0].ethanol_ml).toBeCloseTo(2 * 29.5735 * 0.4, 9);
    expect(entries[0].unit).toBe("oz");
  });

  it("skips drinks that are not locked", () => {
    const drinks: LockedDrinkSource[] = [
      { id: "a", category: "beer_pint", drink: "Guinness", quantity: "2", unit: "pints" },
    ];
    expect(lockedDrinkEntries(drinks, [], CATALOG)).toEqual([]);
    expect(lockedDrinkEntries(drinks, ["other"], CATALOG)).toEqual([]);
  });

  it("skips invalid quantities and zero or negative quantities", () => {
    const drinks: LockedDrinkSource[] = [
      { id: "a", category: "beer_pint", drink: "Guinness", quantity: "abc", unit: "pints" },
      { id: "b", category: "beer_pint", drink: "Guinness", quantity: "0", unit: "pints" },
      { id: "c", category: "beer_pint", drink: "Guinness", quantity: "-2", unit: "pints" },
    ];
    expect(lockedDrinkEntries(drinks, ["a", "b", "c"], CATALOG)).toEqual([]);
  });

  it("skips invalid custom ABVs and custom drinks without one", () => {
    const drinks: LockedDrinkSource[] = [
      { id: "a", category: "custom", drink: "X", isCustom: true, customABV: "xx", quantity: "1", unit: "shots" },
      { id: "b", category: "custom", drink: "Y", isCustom: true, quantity: "1", unit: "shots" },
    ];
    expect(lockedDrinkEntries(drinks, ["a", "b"], CATALOG)).toEqual([]);
  });

  it("keeps unknown catalog drinks with zero ethanol and a fallback id", () => {
    const drinks: LockedDrinkSource[] = [
      { id: "a", category: "misc", drink: "NotInCatalog", quantity: "1", unit: "ml" },
    ];
    expect(lockedDrinkEntries(drinks, ["a"], CATALOG)).toEqual([
      { catalog_id: "misc::NotInCatalog", quantity: 1, unit: "ml", ethanol_ml: 0 },
    ]);
  });
});

describe("lockedEthanolTotal", () => {
  it("sums finite ethanol values and ignores non-finite ones", () => {
    const entries: LockedDrink[] = [
      { catalog_id: "a", quantity: 1, unit: "pints", ethanol_ml: 10 },
      { catalog_id: "b", quantity: 1, unit: "pints", ethanol_ml: 5 },
      { catalog_id: "c", quantity: 1, unit: "pints", ethanol_ml: NaN },
      { catalog_id: "d", quantity: 1, unit: "pints", ethanol_ml: Infinity },
    ];
    expect(lockedEthanolTotal(entries)).toBe(15);
    expect(lockedEthanolTotal([])).toBe(0);
  });
});

describe("requestFingerprint", () => {
  it("is deterministic for the same request", () => {
    const a = requestFingerprint(baseRequest());
    const b = requestFingerprint(baseRequest());
    expect(a).toBe(b);
  });

  it("is insensitive to object key insertion order", () => {
    const first: GeneratePlanInput = {
      target_ethanol_ml: 45,
      duration_minutes: 180,
      preferences: PREFERENCES,
      catalog: CATALOG,
    };
    const second = {} as GeneratePlanInput;
    second["catalog"] = CATALOG;
    second["preferences"] = PREFERENCES;
    second["duration_minutes"] = 180;
    second["target_ethanol_ml"] = 45;
    expect(requestFingerprint(first)).toBe(requestFingerprint(second));
  });

  it("changes when the budget, duration, preferences, catalog, or excludes change", () => {
    const base = requestFingerprint(baseRequest());
    expect(requestFingerprint(baseRequest({ target_ethanol_ml: 50 }))).not.toBe(base);
    expect(requestFingerprint(baseRequest({ duration_minutes: 240 }))).not.toBe(base);
    expect(
      requestFingerprint(baseRequest({ preferences: { ...PREFERENCES, sweet: 0.8 } }))
    ).not.toBe(base);
    expect(
      requestFingerprint(baseRequest({ catalog: [CATALOG[0]] }))
    ).not.toBe(base);
    expect(requestFingerprint(baseRequest({ exclude: ["beer_pint::Guinness"] }))).not.toBe(base);
  });

  it("invalidates when two equal-ethanol locked drinks have different catalog ids", () => {
    const lockedA: LockedDrink[] = [{ catalog_id: "beer_pint::Guinness", quantity: 1, unit: "pints", ethanol_ml: 15 }];
    const lockedB: LockedDrink[] = [{ catalog_id: "vodka::Absolut", quantity: 1, unit: "shots", ethanol_ml: 15 }];
    expect(requestFingerprint(baseRequest({ locked_drinks: lockedA }))).not.toBe(
      requestFingerprint(baseRequest({ locked_drinks: lockedB }))
    );
  });

  it("invalidates when two locked drinks are swapped in order", () => {
    const lockedA: LockedDrink[] = [
      { catalog_id: "beer_pint::Guinness", quantity: 1, unit: "pints", ethanol_ml: 15 },
      { catalog_id: "wine_red::Merlot", quantity: 1, unit: "glass", ethanol_ml: 15 },
    ];
    const lockedB: LockedDrink[] = [
      { catalog_id: "wine_red::Merlot", quantity: 1, unit: "glass", ethanol_ml: 15 },
      { catalog_id: "beer_pint::Guinness", quantity: 1, unit: "pints", ethanol_ml: 15 },
    ];
    expect(requestFingerprint(baseRequest({ locked_drinks: lockedA }))).not.toBe(
      requestFingerprint(baseRequest({ locked_drinks: lockedB }))
    );
  });
});

describe("resolvePlanningWindow", () => {
  const now = new Date(2026, 1, 10, 22, 0, 0, 0);
  const DURATION_MINUTES = 240;

  it("resets when start and target are both absent", () => {
    const resolved = resolvePlanningWindow(null, null, DURATION_MINUTES, now);
    expect(resolved.start.getTime()).toBe(now.getTime());
    expect(resolved.target.getTime()).toBe(now.getTime() + DURATION_MINUTES * 60_000);
  });

  it("resets when only the start or only the target is absent", () => {
    const futureTarget = new Date(2026, 1, 10, 23, 59, 0, 0);
    expect(resolvePlanningWindow(null, futureTarget, DURATION_MINUTES, now).start.getTime()).toBe(
      now.getTime()
    );
    const pastStart = new Date(2026, 1, 10, 20, 0, 0, 0);
    expect(resolvePlanningWindow(pastStart, null, DURATION_MINUTES, now).target.getTime()).toBe(
      now.getTime() + DURATION_MINUTES * 60_000
    );
  });

  it("resets on invalid dates", () => {
    const invalid = new Date("not-a-date");
    const resolved = resolvePlanningWindow(invalid, invalid, DURATION_MINUTES, now);
    expect(Number.isFinite(resolved.start.getTime())).toBe(true);
    expect(resolved.start.getTime()).toBe(now.getTime());
    expect(resolved.target.getTime()).toBe(now.getTime() + DURATION_MINUTES * 60_000);
  });

  it("resets an expired prior-night window whose target is before now", () => {
    const start = new Date(2026, 1, 9, 21, 30, 0, 0);
    const target = new Date(2026, 1, 10, 1, 30, 0, 0);
    const resolved = resolvePlanningWindow(start, target, DURATION_MINUTES, now);
    expect(resolved.start.getTime()).toBe(now.getTime());
    expect(resolved.target.getTime()).toBe(now.getTime() + DURATION_MINUTES * 60_000);
  });

  it("resets when the target equals now exactly", () => {
    const start = new Date(2026, 1, 10, 18, 0, 0, 0);
    const resolved = resolvePlanningWindow(start, now, DURATION_MINUTES, now);
    expect(resolved.start.getTime()).toBe(now.getTime());
    expect(resolved.target.getTime()).toBe(now.getTime() + DURATION_MINUTES * 60_000);
  });

  it("preserves a live mid-session window with a past start and future target", () => {
    const start = new Date(2026, 1, 10, 20, 0, 0, 0);
    const target = new Date(2026, 1, 10, 23, 59, 0, 0);
    const resolved = resolvePlanningWindow(start, target, DURATION_MINUTES, now);
    expect(resolved.start.getTime()).toBe(start.getTime());
    expect(resolved.target.getTime()).toBe(target.getTime());
  });

  it("preserves a fully future window", () => {
    const start = new Date(2026, 1, 11, 21, 0, 0, 0);
    const target = new Date(2026, 1, 12, 1, 0, 0, 0);
    const resolved = resolvePlanningWindow(start, target, DURATION_MINUTES, now);
    expect(resolved.start.getTime()).toBe(start.getTime());
    expect(resolved.target.getTime()).toBe(target.getTime());
  });

  it("preserves a future window that crosses midnight", () => {
    const start = new Date(2026, 1, 10, 23, 0, 0, 0);
    const target = new Date(2026, 1, 11, 3, 0, 0, 0);
    const resolved = resolvePlanningWindow(start, target, DURATION_MINUTES, now);
    expect(resolved.start.getTime()).toBe(start.getTime());
    expect(resolved.target.getTime()).toBe(target.getTime());
  });
});
