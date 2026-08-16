import { describe, expect, it } from "vitest";
import type { EstablishmentDrink } from "@/hooks/useEstablishments";
import {
  buildOverrideMap,
  compareByPriceCheapestFirst,
  mergeDrinkOverride,
  parseDrinkOverride,
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

  it("lays the user's price over the catalogue's", () => {
    const resolved = resolveDrink(drink(), {
      "drink-1": { establishment_drink_id: "drink-1", price: 6.1, serving_ml: null },
    });
    expect(resolved.price).toBe(6.1);
    expect(resolved.hasPriceOverride).toBe(true);
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

  it("prices an unpriced catalogue row from the override alone", () => {
    const resolved = resolveDrink(drink({ price: null }), {
      "drink-1": { establishment_drink_id: "drink-1", price: 5, serving_ml: null },
    });
    expect(resolved.price).toBe(5);
    expect(resolved.hasPriceOverride).toBe(true);
  });

  it("does not leak one drink's override onto another", () => {
    const resolved = resolveDrinks([drink(), drink({ id: "drink-2", price: 3 })], {
      "drink-1": { establishment_drink_id: "drink-1", price: 9, serving_ml: null },
    });
    expect(resolved.map((d) => d.price)).toEqual([9, 3]);
  });
});

describe("compareByPriceCheapestFirst", () => {
  it("sorts unpriced rows last, not first", () => {
    const sorted = [
      { price: null },
      { price: 5 },
      { price: 2 },
    ].sort(compareByPriceCheapestFirst);
    expect(sorted.map((d) => d.price)).toEqual([2, 5, null]);
  });
});
