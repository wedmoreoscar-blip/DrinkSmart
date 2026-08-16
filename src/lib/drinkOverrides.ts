/**
 * What a user remembers about a drink at a venue, laid over the catalogue row.
 *
 * Two overrides, one record: the price they pay for it, and the serve they
 * actually have. A remembered serve is a preference *about* a drink, not
 * another drink, which is why this is an overlay and not a duplicate
 * `establishment_drinks` row.
 *
 * This module is pure and has no picker or Supabase imports, so every consumer
 * — the picker, the tray, the sorts, the swap screen, the scanner and the AI
 * catalogue — resolves prices and serves the same way.
 *
 * **The scaling rule consumers must observe.** `price` is overlaid onto the
 * catalogue row's own `price` field, so anything already scaling a price by
 * volume keeps working untouched. When `rememberedServingMl` is non-null it is
 * the volume that price is *for*, and therefore the base any per-serving
 * scaling divides by.
 */

import type { EstablishmentDrink } from "@/hooks/useEstablishments";

/** One user's overrides for one establishment drink. */
export type DrinkOverride = {
  establishment_drink_id: string;
  /** Their price for one serve of it, or null if they have not set one. */
  price: number | null;
  /** The serve they actually have, in ml, or null if they have not set one. */
  serving_ml: number | null;
};

/** Overrides keyed by `establishment_drink_id`. */
export type DrinkOverrideMap = Record<string, DrinkOverride>;

export type ResolvedDrink = EstablishmentDrink & {
  /** The user's serve for this drink in ml; null when they have never set one. */
  rememberedServingMl: number | null;
  /** True when `price` came from the user rather than the catalogue. */
  hasPriceOverride: boolean;
};

export const EMPTY_OVERRIDES: DrinkOverrideMap = {};

function toPositiveNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function toPrice(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value;
}

/**
 * Coerce one untrusted override row — from Postgres, where numerics arrive as
 * strings on some drivers, or from the anonymous session store. Returns null
 * when the row carries no usable override at all, so callers never hold an
 * entry that overrides nothing.
 */
export function parseDrinkOverride(raw: unknown): DrinkOverride | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = row.establishment_drink_id;
  if (typeof id !== "string" || id.length === 0) return null;

  const price = toPrice(typeof row.price === "string" ? Number(row.price) : row.price);
  const servingMl = toPositiveNumber(
    typeof row.serving_ml === "string" ? Number(row.serving_ml) : row.serving_ml,
  );
  if (price === null && servingMl === null) return null;

  return { establishment_drink_id: id, price, serving_ml: servingMl };
}

export function buildOverrideMap(rows: readonly unknown[]): DrinkOverrideMap {
  const map: DrinkOverrideMap = {};
  for (const row of rows) {
    const override = parseDrinkOverride(row);
    if (override) map[override.establishment_drink_id] = override;
  }
  return map;
}

/**
 * Merge a partial edit into an existing override. A field the caller does not
 * mention is left as it was; passing an explicit null clears that half.
 * Returns null when nothing is left to remember, which is the signal to delete
 * the record rather than store an empty one.
 */
export function mergeDrinkOverride(
  existing: DrinkOverride | undefined,
  establishmentDrinkId: string,
  patch: { price?: number | null; serving_ml?: number | null },
): DrinkOverride | null {
  const price = "price" in patch ? toPrice(patch.price) : (existing?.price ?? null);
  const servingMl =
    "serving_ml" in patch ? toPositiveNumber(patch.serving_ml) : (existing?.serving_ml ?? null);
  if (price === null && servingMl === null) return null;
  return { establishment_drink_id: establishmentDrinkId, price, serving_ml: servingMl };
}

/** Lay one user's overrides over one catalogue row. */
export function resolveDrink(
  drink: EstablishmentDrink,
  overrides: DrinkOverrideMap = EMPTY_OVERRIDES,
): ResolvedDrink {
  const override = overrides[drink.id];
  if (!override) {
    return { ...drink, rememberedServingMl: null, hasPriceOverride: false };
  }
  return {
    ...drink,
    price: override.price ?? drink.price,
    rememberedServingMl: override.serving_ml,
    hasPriceOverride: override.price !== null,
  };
}

/**
 * Lay a user's overrides over a whole venue catalogue. Identity is preserved
 * when there is nothing to apply, so consumers memoizing on the array reference
 * do not re-render for users who have set no overrides.
 */
export function resolveDrinks(
  drinks: readonly EstablishmentDrink[],
  overrides: DrinkOverrideMap = EMPTY_OVERRIDES,
): ResolvedDrink[] {
  return drinks.map((drink) => resolveDrink(drink, overrides));
}

/**
 * Sort comparator for `Cheapest first`. An unpriced drink sorts **last**
 * rather than first: with the seeded catalogue still carrying no prices, a
 * naive ascending sort on null would put every unpriced row at the top and
 * present "cheapest" as an answer nobody computed.
 */
export function compareByPriceCheapestFirst(
  a: Pick<EstablishmentDrink, "price">,
  b: Pick<EstablishmentDrink, "price">,
): number {
  const left = a.price ?? Number.POSITIVE_INFINITY;
  const right = b.price ?? Number.POSITIVE_INFINITY;
  return left - right;
}
