import type { Database } from "@/integrations/supabase/types";
import type { ParsedDrink, ScanFailure } from "./types";

export type ReviewField = "abv" | "serve" | "price";

export type GapTarget = {
  drinkIndex: number;
  field: ReviewField;
};

const GAP_FIELDS: ReviewField[] = ["abv", "serve", "price"];

const fieldValue = (drink: ParsedDrink, field: ReviewField): number | null => {
  if (field === "serve") return drink.volume;
  return drink[field];
};

export const drinkHasGap = (drink: ParsedDrink): boolean =>
  GAP_FIELDS.some((field) => fieldValue(drink, field) == null);

export const countDrinkGaps = (drinks: ParsedDrink[]): number =>
  drinks.reduce(
    (count, drink) =>
      count + GAP_FIELDS.filter((field) => fieldValue(drink, field) == null).length,
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
  GAP_FIELDS.find((field) => fieldValue(drink, field) == null) ?? null;

export const nextGapTarget = (
  drinks: ParsedDrink[],
  current: GapTarget,
): GapTarget | null => {
  const startField = GAP_FIELDS.indexOf(current.field);
  for (let drinkIndex = current.drinkIndex; drinkIndex < drinks.length; drinkIndex += 1) {
    const fieldStart = drinkIndex === current.drinkIndex ? startField + 1 : 0;
    for (let fieldIndex = fieldStart; fieldIndex < GAP_FIELDS.length; fieldIndex += 1) {
      const field = GAP_FIELDS[fieldIndex];
      if (fieldValue(drinks[drinkIndex], field) == null) return { drinkIndex, field };
    }
  }
  return null;
};

export const classifyScanError = (error: unknown, online: boolean): ScanFailure => {
  if (!online) return "offline";
  const message = error instanceof Error ? error.message : String(error);
  return /network|offline|failed to fetch/i.test(message) ? "offline" : "refused";
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
