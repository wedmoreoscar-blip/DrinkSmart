import { OZ_ML, PINT_ML } from "@/lib/drinkConstants";
import { fallbackAbv, fallbackServeMl } from "@/lib/drinkFallbacks";
import type { Database } from "@/integrations/supabase/types";
import type { ParsedDrink, RawParsedDrink, ScanFailure } from "./types";

export type ReviewField = "abv" | "serve" | "price";

export type GapTarget = {
  drinkIndex: number;
  field: ReviewField;
};

const GAP_FIELDS: ReviewField[] = ["abv", "serve", "price"];

/** Read a review field off a drink; `serve` is stored as `volume`. */
export const reviewFieldValue = (drink: ParsedDrink, field: ReviewField): number | null => {
  if (field === "serve") return drink.volume;
  return drink[field];
};

export const drinkHasGap = (drink: ParsedDrink): boolean =>
  GAP_FIELDS.some((field) => reviewFieldValue(drink, field) == null);

export const countDrinkGaps = (drinks: ParsedDrink[]): number =>
  drinks.reduce(
    (count, drink) =>
      count + GAP_FIELDS.filter((field) => reviewFieldValue(drink, field) == null).length,
    0,
  );

export const orderDrinkIndices = (
  drinks: ParsedDrink[],
): { gapped: number[]; clean: number[] } =>
  drinks.reduce<{ gapped: number[]; clean: number[] }>(
    (ordered, drink, index) => {
      ordered[drinkHasGap(drink) ? "gapped" : "clean"].push(index);
      return ordered;
    },
    { gapped: [], clean: [] },
  );

export const firstGapField = (drink: ParsedDrink): ReviewField | null =>
  GAP_FIELDS.find((field) => reviewFieldValue(drink, field) == null) ?? null;

export const nextGapTarget = (
  drinks: ParsedDrink[],
  current: GapTarget,
): GapTarget | null => {
  const startField = GAP_FIELDS.indexOf(current.field);
  for (let drinkIndex = current.drinkIndex; drinkIndex < drinks.length; drinkIndex += 1) {
    const fieldStart = drinkIndex === current.drinkIndex ? startField + 1 : 0;
    for (let fieldIndex = fieldStart; fieldIndex < GAP_FIELDS.length; fieldIndex += 1) {
      const field = GAP_FIELDS[fieldIndex];
      if (reviewFieldValue(drinks[drinkIndex], field) == null) return { drinkIndex, field };
    }
  }
  return null;
};

export const classifyScanError = (error: unknown, online: boolean): ScanFailure => {
  if (!online) return "offline";
  const message = error instanceof Error ? error.message : String(error);
  return /network|offline|failed to fetch/i.test(message) ? "offline" : "refused";
};

// Realistic serving bounds, matching the custom-drink serve validation
// (between 25 and 1000 ml). Anything outside is unreadable, so it follows the
// missing-value path and becomes an estimated fallback.
const MIN_SERVE_ML = 25;
const MAX_SERVE_ML = 1000;

const validAbv = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : null;

const validPrice = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

/**
 * Convert a visible serving to absolute ml. The unit table is the scanner's
 * single mapping: ml (and bottle/can/unknown units, whose numeric value is
 * already the absolute amount) pass through; pint, half-pint, shot and oz are
 * counts multiplied by their fixed sizes; glass uses 175 ml per glass unless
 * the supplied number is already an explicit ml amount (> 10), mirroring
 * picker-model's databaseVolumeMl convention. Any result outside the realistic
 * bounds, or a non-finite input, is treated as missing.
 */
const volumeToMl = (volume: unknown, unit: string | null): number | null => {
  const count = typeof volume === "number" && Number.isFinite(volume) ? volume : null;
  const normalizedUnit = (unit ?? "").toLowerCase().trim();
  let ml: number | null;
  if (normalizedUnit === "pint") ml = (count ?? 1) * PINT_ML;
  else if (/half[ -]?pint/.test(normalizedUnit)) ml = (count ?? 1) * (PINT_ML / 2);
  else if (/shot/.test(normalizedUnit)) ml = (count ?? 1) * 25;
  else if (/oz/.test(normalizedUnit)) ml = (count ?? 1) * OZ_ML;
  else if (/glass/.test(normalizedUnit)) ml = count !== null && count > 10 ? count : (count ?? 1) * 175;
  else ml = count;
  return ml !== null && Number.isFinite(ml) && ml >= MIN_SERVE_ML && ml <= MAX_SERVE_ML
    ? ml
    : null;
};

/**
 * Normalize the Edge Function's raw output into review-ready drinks. Names are
 * trimmed (unnamed rows are unusable and dropped); every visible unit becomes
 * absolute ml; missing or invalid ABV/serving take the deterministic fallbacks
 * from drinkFallbacks.ts and are flagged estimated; price stays null when
 * missing. Exact repeated servings — same normalized name, same absolute ml,
 * same price — collapse into one row; same-name drinks with different volumes
 * or prices remain separate.
 */
export const normalizeParsedDrinks = (rawDrinks: RawParsedDrink[]): ParsedDrink[] => {
  const seen = new Set<string>();
  const normalized: ParsedDrink[] = [];
  for (const raw of rawDrinks) {
    const name = (raw.name ?? "").trim();
    if (!name) continue;
    const volume = volumeToMl(raw.volume, raw.volumeUnit);
    const abv = validAbv(raw.abv);
    const price = validPrice(raw.price);
    const drink: ParsedDrink = {
      name,
      abv: abv ?? fallbackAbv(raw.category, raw.categoryLabel),
      category: raw.category,
      categoryLabel: raw.categoryLabel,
      price,
      volume: volume ?? fallbackServeMl(raw.category, raw.categoryLabel),
      volumeUnit: "ml",
      abvEstimated: abv === null,
      volumeEstimated: volume === null,
    };
    const key = `${name}\u0000${drink.volume}\u0000${drink.price ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(drink);
  }
  return normalized;
};

export const toEstablishmentDrinkInsert = (
  drink: ParsedDrink,
  establishmentId: string,
  userId: string | null,
): Database["public"]["Tables"]["establishment_drinks"]["Insert"] => ({
  establishment_id: establishmentId,
  drink_name: drink.name.trim(),
  abv: drink.abv,
  category: drink.category,
  category_label: drink.categoryLabel,
  price: drink.price,
  volume: drink.volume,
  volume_unit: drink.volumeUnit,
  user_id: userId,
});
