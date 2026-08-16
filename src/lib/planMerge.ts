import { entryServingCount } from "@/components/picker/wave5-picker";
import type { AlcoholTimelineEntryInput } from "@/lib/sessionEngine";

/**
 * Merging rules for planned drinks.
 *
 * Two picks are the same drink when they share an origin, a name, a category and
 * a **per-serving volume**. The serving's *name* is irrelevant: "DB volume" and
 * "Standard" are one drink whenever they resolve to the same number of ml, while
 * a pint and a half pint, or a single and a double, are two. Origin separates a
 * custom drink added from the Custom drink sheet from the same drink picked out
 * of a category tab, because those are two deliberate choices.
 */

/** The volume of one serving, or null when the entry has no usable quantity. */
export const perServingMl = (entry: AlcoholTimelineEntryInput): number | null => {
  if (entry.unit !== "ml") return null;
  const total = parseFloat(entry.quantity ?? "");
  const servings = entryServingCount(entry);
  if (!Number.isFinite(total) || total <= 0 || servings <= 0) return null;
  return total / servings;
};

/** Volumes within this many ml are the same serving, absorbing float drift. */
const ML_TOLERANCE = 0.01;

export const isSamePlannedDrink = (
  a: AlcoholTimelineEntryInput,
  b: AlcoholTimelineEntryInput,
): boolean => {
  if (!!a.isCustom !== !!b.isCustom) return false;
  if (a.category !== b.category) return false;
  const nameA = a.isCustom ? a.customName : a.drink;
  const nameB = b.isCustom ? b.customName : b.drink;
  if (!nameA || nameA !== nameB) return false;
  const mlA = perServingMl(a);
  const mlB = perServingMl(b);
  if (mlA === null || mlB === null) return false;
  return Math.abs(mlA - mlB) < ML_TOLERANCE;
};

/** Rewrite an entry to hold a given number of its own servings. */
export const withServings = <T extends AlcoholTimelineEntryInput>(
  entry: T,
  servings: number,
): T => {
  const ml = perServingMl(entry);
  if (ml === null || servings < 1) return entry;
  return {
    ...entry,
    quantity: String(ml * servings),
    portions: servings > 1 ? servings : undefined,
  };
};

/**
 * Fold duplicate picks into the earliest matching entry, preserving order.
 * `canMerge` gates which entries may move — a consumed drink is history and is
 * always left exactly as it is.
 */
export const mergePlanDuplicates = <T extends AlcoholTimelineEntryInput>(
  entries: T[],
  canMerge: (entry: T) => boolean,
): T[] => {
  const merged: T[] = [];
  for (const entry of entries) {
    if (!canMerge(entry)) {
      merged.push(entry);
      continue;
    }
    const targetIndex = merged.findIndex(
      (candidate) => canMerge(candidate) && isSamePlannedDrink(candidate, entry),
    );
    if (targetIndex === -1) {
      merged.push(entry);
      continue;
    }
    merged[targetIndex] = withServings(
      merged[targetIndex],
      entryServingCount(merged[targetIndex]) + entryServingCount(entry),
    );
  }
  return merged;
};
