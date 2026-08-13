import { describe, expect, it } from "vitest";

import {
  classifyScanError,
  countDrinkGaps,
  nextGapTarget,
  orderDrinkIndices,
  toEstablishmentDrinkInsert,
} from "./scanner-model";
import type { ParsedDrink } from "./types";

const parsed = (overrides: Partial<ParsedDrink>): ParsedDrink => ({
  name: "Drink",
  abv: 4,
  category: "beer",
  categoryLabel: "Beer",
  price: 5,
  volume: 568,
  volumeUnit: "ml",
  ...overrides,
});

describe("W4-6 scanner contract", () => {
  it("keeps gap rows first without changing order inside either partition", () => {
    const drinks = [
      parsed({ name: "clean one" }),
      parsed({ name: "gap one", price: null }),
      parsed({ name: "clean two" }),
      parsed({ name: "gap two", abv: null }),
    ];

    expect(orderDrinkIndices(drinks)).toEqual({ gapped: [1, 3], clean: [0, 2] });
    expect(countDrinkGaps(drinks)).toBe(2);
  });

  it("advances from the current field to the next gap, including across drinks", () => {
    const drinks = [
      parsed({ abv: null, price: null }),
      parsed({ volume: null }),
    ];

    expect(nextGapTarget(drinks, { drinkIndex: 0, field: "abv" })).toEqual({
      drinkIndex: 0,
      field: "price",
    });
    expect(nextGapTarget(drinks, { drinkIndex: 0, field: "price" })).toEqual({
      drinkIndex: 1,
      field: "serve",
    });
  });

  it("preserves missing ABV as null in persistence instead of dropping or substituting zero", () => {
    const row = toEstablishmentDrinkInsert(parsed({ name: "Unknown", abv: null }), "venue-1", "user-1");

    expect(row.drink_name).toBe("Unknown");
    expect(row.abv).toBeNull();
  });

  it("maps real failures into the four specified classes", () => {
    expect(classifyScanError(new Error("Failed to fetch"), true)).toBe("offline");
    expect(classifyScanError(new Error("service refused"), true)).toBe("refused");
    expect(classifyScanError(new Error("anything"), false)).toBe("offline");
  });
});
