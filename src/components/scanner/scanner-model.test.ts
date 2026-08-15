import { describe, expect, it } from "vitest";

import {
  classifyScanError,
  countDrinkGaps,
  nextGapTarget,
  normalizeParsedDrinks,
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

describe("W5-8 scanner normalization", () => {
  it("converts visible serving units to absolute ml before review", () => {
    const normalized = normalizeParsedDrinks([
      { name: "Pint", abv: 5, category: "beer", categoryLabel: "Beer", price: 5, volume: 1, volumeUnit: "pint" },
      { name: "Half", abv: 5, category: "beer", categoryLabel: "Beer", price: 3, volume: 1, volumeUnit: "half-pint" },
      { name: "Shot", abv: 40, category: "shots", categoryLabel: "Shots", price: 3, volume: 2, volumeUnit: "shot" },
      { name: "Glass count", abv: 13, category: "wine", categoryLabel: "Wine", price: 6, volume: 1, volumeUnit: "glass" },
      { name: "Glass ml", abv: 13, category: "wine", categoryLabel: "Wine", price: 7, volume: 250, volumeUnit: "glass" },
      { name: "Ounce", abv: 40, category: "spirits", categoryLabel: "Spirits", price: 4, volume: 1, volumeUnit: "oz" },
    ]);

    expect(normalized.map((drink) => drink.volume)).toEqual([568, 284, 50, 175, 250, 29.5735]);
    expect(normalized.every((drink) => drink.volumeUnit === "ml")).toBe(true);
    expect(normalized.every((drink) => drink.volumeEstimated === false)).toBe(true);
  });

  it("applies and marks fallbacks for missing or invalid facts while preserving null price", () => {
    const [drink] = normalizeParsedDrinks([
      {
        name: "  House red  ",
        abv: Number.NaN,
        category: "wine",
        categoryLabel: "Red wine",
        price: -1,
        volume: 1,
        volumeUnit: "bottle",
      },
    ]);

    expect(drink).toMatchObject({
      name: "House red",
      abv: 13,
      volume: 175,
      volumeUnit: "ml",
      price: null,
      abvEstimated: true,
      volumeEstimated: true,
    });
    expect(countDrinkGaps([drink])).toBe(1);
  });

  it("drops nameless rows and deduplicates only an exact normalized serving", () => {
    const normalized = normalizeParsedDrinks([
      { name: " ", abv: 5, category: "beer", categoryLabel: "Beer", price: 5, volume: 568, volumeUnit: "ml" },
      { name: "Lager", abv: 5, category: "beer", categoryLabel: "Beer", price: 5, volume: 568, volumeUnit: "ml" },
      { name: " Lager ", abv: 5, category: "beer", categoryLabel: "Beer", price: 5, volume: 568, volumeUnit: "ml" },
      { name: "Lager", abv: 5, category: "beer", categoryLabel: "Beer", price: 3, volume: 284, volumeUnit: "ml" },
      { name: "Lager", abv: 5, category: "beer", categoryLabel: "Beer", price: 6, volume: 568, volumeUnit: "ml" },
    ]);

    expect(normalized.map(({ name, volume, price }) => ({ name, volume, price }))).toEqual([
      { name: "Lager", volume: 568, price: 5 },
      { name: "Lager", volume: 284, price: 3 },
      { name: "Lager", volume: 568, price: 6 },
    ]);
  });
});
