import { describe, expect, it } from "vitest";
import type { EstablishmentDrink } from "@/hooks/useEstablishments";
import {
  buildOverrideMap,
  buildPriceMap,
  compareByResolvedPrice,
  EMPTY_OVERRIDES,
  mergeDrinkOverride,
  parseDrinkOverride,
  parseDrinkPrice,
  resolveDrink,
  resolveDrinks,
} from "@/lib/drinkOverrides";

function drink(overrides: Partial<EstablishmentDrink> = {}): EstablishmentDrink {
  return {
    id: "drink-1",
    establishment_id: "venue-1",
    drink_name: "Lager",
    abv: 4.5,
    category: "beer",
    category_label: "Beer & cider",
    price: 4.2,
    volume: 1,
    volume_unit: "pint",
    ...overrides,
  };
}

describe("parseDrinkOverride", () => {
  it("accepts a row with either half set", () => {
    expect(parseDrinkOverride({ establishment_drink_id: "d", price: 5, serving_ml: null })).toEqual({
      establishment_drink_id: "d",
      price: 5,
      serving_ml: null,
    });
    expect(parseDrinkOverride({ establishment_drink_id: "d", price: null, serving_ml: 400 })).toEqual({
      establishment_drink_id: "d",
      price: null,
      serving_ml: 400,
    });
  });

  it("coerces the strings a numeric column can arrive as", () => {
    expect(parseDrinkOverride({ establishment_drink_id: "d", price: "5.50", serving_ml: "400" })).toEqual(
      { establishment_drink_id: "d", price: 5.5, serving_ml: 400 },
    );
  });

  it("rejects a row that overrides nothing, so no empty entry is ever held", () => {
    expect(parseDrinkOverride({ establishment_drink_id: "d", price: null, serving_ml: null })).toBeNull();
    expect(parseDrinkOverride({ establishment_drink_id: "", price: 5 })).toBeNull();
    expect(parseDrinkOverride(null)).toBeNull();
  });

  it("rejects impossible money and volumes rather than storing them", () => {
    expect(parseDrinkOverride({ establishment_drink_id: "d", price: -3 })).toBeNull();
    expect(parseDrinkOverride({ establishment_drink_id: "d", serving_ml: 0 })).toBeNull();
    expect(parseDrinkOverride({ establishment_drink_id: "d", serving_ml: -100 })).toBeNull();
    // A free drink is a real price and must survive.
    expect(parseDrinkOverride({ establishment_drink_id: "d", price: 0 })?.price).toBe(0);
  });
});

describe("buildOverrideMap", () => {
  it("keys by establishment drink and drops unusable rows", () => {
    const map = buildOverrideMap([
      { establishment_drink_id: "a", price: 5, serving_ml: null },
      { establishment_drink_id: "b", price: null, serving_ml: null },
      "junk",
    ]);
    expect(Object.keys(map)).toEqual(["a"]);
  });
});

describe("mergeDrinkOverride", () => {
  it("leaves an unmentioned half alone", () => {
    const existing = { establishment_drink_id: "d", price: 5, serving_ml: 400 };
    expect(mergeDrinkOverride(existing, "d", { price: 6 })).toEqual({
      establishment_drink_id: "d",
      price: 6,
      serving_ml: 400,
    });
    expect(mergeDrinkOverride(existing, "d", { serving_ml: 250 })).toEqual({
      establishment_drink_id: "d",
      price: 5,
      serving_ml: 250,
    });
  });

  it("clears one half on an explicit null", () => {
    const existing = { establishment_drink_id: "d", price: 5, serving_ml: 400 };
    expect(mergeDrinkOverride(existing, "d", { price: null })).toEqual({
      establishment_drink_id: "d",
      price: null,
      serving_ml: 400,
    });
  });

  it("returns null when nothing is left to remember, signalling a delete", () => {
    const existing = { establishment_drink_id: "d", price: 5, serving_ml: null };
    expect(mergeDrinkOverride(existing, "d", { price: null })).toBeNull();
    expect(mergeDrinkOverride(undefined, "d", {})).toBeNull();
  });

  it("creates from nothing", () => {
    expect(mergeDrinkOverride(undefined, "d", { price: 4 })).toEqual({
      establishment_drink_id: "d",
      price: 4,
      serving_ml: null,
    });
  });
});

describe("resolveDrink", () => {
  it("is a no-op without an override", () => {
    const resolved = resolveDrink(drink(), {});
    expect(resolved.price).toBe(4.2);
    expect(resolved.rememberedServingMl).toBeNull();
    expect(resolved.hasPriceOverride).toBe(false);
  });

  // A user price no longer overwrites the catalogue's. It is a rung at a stated
  // volume, and the catalogue row stays exactly as it is — the two are prices
  // of different things until a volume says otherwise.
  it("carries the user's priced volumes as rungs, leaving the catalogue row alone", () => {
    const resolved = resolveDrink(drink(), EMPTY_OVERRIDES, {
      "drink-1": [{ volumeMl: 568, price: 6.1 }],
    });
    expect(resolved.price).toBe(4.2);
    expect(resolved.userPricedRungs).toEqual([{ volumeMl: 568, price: 6.1 }]);
    expect(resolved.hasPriceOverride).toBe(true);
  });

  it("reports no price override when the user has priced nothing", () => {
    const resolved = resolveDrink(drink());
    expect(resolved.userPricedRungs).toEqual([]);
    expect(resolved.hasPriceOverride).toBe(false);
  });

  // The catalogue price must survive a serve-only override: the user said how
  // much they drink, not what it costs.
  it("keeps the catalogue price when only the serve is remembered", () => {
    const resolved = resolveDrink(drink(), {
      "drink-1": { establishment_drink_id: "drink-1", price: null, serving_ml: 400 },
    });
    expect(resolved.price).toBe(4.2);
    expect(resolved.hasPriceOverride).toBe(false);
    expect(resolved.rememberedServingMl).toBe(400);
  });

  it("gives an unpriced catalogue row its rungs from the user alone", () => {
    const resolved = resolveDrink(drink({ price: null }), EMPTY_OVERRIDES, {
      "drink-1": [{ volumeMl: 330, price: 5 }],
    });
    expect(resolved.price).toBeNull();
    expect(resolved.userPricedRungs).toEqual([{ volumeMl: 330, price: 5 }]);
    expect(resolved.hasPriceOverride).toBe(true);
  });

  it("does not leak one drink's rungs onto another", () => {
    const resolved = resolveDrinks([drink(), drink({ id: "drink-2", price: 3 })], EMPTY_OVERRIDES, {
      "drink-1": [{ volumeMl: 568, price: 9 }],
    });
    expect(resolved.map((d) => d.userPricedRungs)).toEqual([[{ volumeMl: 568, price: 9 }], []]);
  });

  it("groups price rows into ascending rungs, last write winning per volume", () => {
    const map = buildPriceMap([
      { establishment_drink_id: "drink-1", serving_ml: 568, price: 4 },
      { establishment_drink_id: "drink-1", serving_ml: 284, price: 2.5 },
      { establishment_drink_id: "drink-1", serving_ml: 568, price: 3.8 },
      { establishment_drink_id: "drink-1", serving_ml: null, price: 3 },
      { establishment_drink_id: "drink-1", serving_ml: 330 },
    ]);
    expect(map["drink-1"]).toEqual([
      { volumeMl: 284, price: 2.5 },
      { volumeMl: 568, price: 3.8 },
    ]);
  });

  // A price with no volume is exactly the ambiguity the design removes.
  it("drops a price row missing either half", () => {
    expect(parseDrinkPrice({ establishment_drink_id: "d", serving_ml: 25 })).toBeNull();
    expect(parseDrinkPrice({ establishment_drink_id: "d", price: 3 })).toBeNull();
    expect(parseDrinkPrice({ serving_ml: 25, price: 3 })).toBeNull();
    // Postgres numerics arrive as strings on some drivers.
    expect(parseDrinkPrice({ establishment_drink_id: "d", serving_ml: "25", price: "3" })).toEqual({
      establishment_drink_id: "d",
      serving_ml: 25,
      price: 3,
    });
  });
});

describe("compareByResolvedPrice", () => {
  it("sorts unpriced rows last, not first", () => {
    // A naive ascending sort on null puts every unpriced row at the top and
    // presents "cheapest" as an answer nobody computed.
    expect([null, 5, 2].sort(compareByResolvedPrice)).toEqual([2, 5, null]);
  });

  it("compares resolved money rather than a stored figure", () => {
    // Two prices are only comparable at a stated volume, which is why the
    // caller resolves them first: this no longer reads drink.price at all.
    expect([7, 3, null, 4].sort(compareByResolvedPrice)).toEqual([3, 4, 7, null]);
  });
});
