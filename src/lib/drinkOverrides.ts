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
import { sameVolumeMl, type PricedRung } from "@/lib/basePricing";

/** One user's overrides for one establishment drink. */
export type DrinkOverride = {
  establishment_drink_id: string;
  /**
   * @deprecated Always null. Prices live in `user_drink_prices`, keyed by the
   * volume they price. Kept only until the column is dropped.
   */
  price: number | null;
  /** The serve they actually have, in ml, or null if they have not set one. */
  serving_ml: number | null;
};

/** One user's price for one volume of one establishment drink. */
export type DrinkPrice = {
  establishment_drink_id: string;
  /** The volume this price is the price of. Always positive. */
  serving_ml: number;
  /** Money for exactly one of that volume. */
  price: number;
};

/** Overrides keyed by `establishment_drink_id`. */
export type DrinkOverrideMap = Record<string, DrinkOverride>;

/** Priced rungs keyed by `establishment_drink_id`, ascending by volume. */
export type DrinkPriceMap = Record<string, PricedRung[]>;

export type ResolvedDrink = EstablishmentDrink & {
  /** The user's serve for this drink in ml; null when they have never set one. */
  rememberedServingMl: number | null;
  /**
   * Volumes this user has priced for this drink, each its own rung. A rung is
   * created by pricing a volume, so this is also how a user's own measures — a
   * US 30 ml single, an odd 60 ml pour — come to exist.
   *
   * The catalogue row's own price is **not** included: this module is pure and
   * does not know how to turn `volume`/`volume_unit` into millilitres. The
   * picker composes the full ladder — see `rungsFor` in `picker-model.ts`.
   */
  userPricedRungs: PricedRung[];
  /** True when the user has priced at least one volume of this drink. */
  hasPriceOverride: boolean;
};

export const EMPTY_OVERRIDES: DrinkOverrideMap = {};
export const EMPTY_PRICES: DrinkPriceMap = {};
const NO_RUNGS: PricedRung[] = [];

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

/**
 * Coerce one untrusted price row. Both fields are required: a price with no
 * volume is exactly the ambiguity the design removes, so a row missing either
 * is dropped rather than guessed at.
 */
export function parseDrinkPrice(raw: unknown): DrinkPrice | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = row.establishment_drink_id;
  if (typeof id !== "string" || id.length === 0) return null;

  const servingMl = toPositiveNumber(
    typeof row.serving_ml === "string" ? Number(row.serving_ml) : row.serving_ml,
  );
  const price = toPrice(typeof row.price === "string" ? Number(row.price) : row.price);
  if (servingMl === null || price === null) return null;

  return { establishment_drink_id: id, serving_ml: servingMl, price };
}

/**
 * Group price rows into rungs per drink, ascending by volume. A duplicate
 * volume keeps the last row seen — the unique constraint makes that impossible
 * in Postgres, but the anonymous store has no such guarantee.
 */
export function buildPriceMap(rows: readonly unknown[]): DrinkPriceMap {
  const map: DrinkPriceMap = {};
  for (const row of rows) {
    const parsed = parseDrinkPrice(row);
    if (!parsed) continue;
    const rungs = map[parsed.establishment_drink_id] ?? [];
    const existing = rungs.findIndex((rung) => sameVolumeMl(rung.volumeMl, parsed.serving_ml));
    const rung: PricedRung = { volumeMl: parsed.serving_ml, price: parsed.price };
    if (existing === -1) rungs.push(rung);
    else rungs[existing] = rung;
    map[parsed.establishment_drink_id] = rungs;
  }
  for (const id of Object.keys(map)) {
    map[id].sort((a, b) => a.volumeMl - b.volumeMl);
  }
  return map;
}

/** Lay one user's overrides and prices over one catalogue row. */
export function resolveDrink(
  drink: EstablishmentDrink,
  overrides: DrinkOverrideMap = EMPTY_OVERRIDES,
  prices: DrinkPriceMap = EMPTY_PRICES,
): ResolvedDrink {
  const override = overrides[drink.id];
  const userPricedRungs = prices[drink.id] ?? NO_RUNGS;
  return {
    ...drink,
    rememberedServingMl: override?.serving_ml ?? null,
    userPricedRungs,
    hasPriceOverride: userPricedRungs.length > 0,
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
  prices: DrinkPriceMap = EMPTY_PRICES,
): ResolvedDrink[] {
  return drinks.map((drink) => resolveDrink(drink, overrides, prices));
}

/**
 * Sort comparator for `Cheapest first`, over prices the caller has already
 * resolved. An unpriced drink sorts **last** rather than first: a naive
 * ascending sort on null puts every unpriced row at the top and presents
 * "cheapest" as an answer nobody computed.
 *
 * It takes resolved money rather than a drink because pricing now depends on
 * which serving is being compared, and only the picker knows that. Comparing
 * `drink.price` directly — as this used to — would compare figures denominated
 * in different volumes.
 */
export function compareByResolvedPrice(
  a: number | null,
  b: number | null,
): number {
  const left = a ?? Number.POSITIVE_INFINITY;
  const right = b ?? Number.POSITIVE_INFINITY;
  return left - right;
}
