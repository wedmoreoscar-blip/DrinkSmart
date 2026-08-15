import { convertToMl } from "@/lib/timelineHelpers";
import type { CatalogItem, DrinkUnit } from "@/lib/planCatalog";
import type { GeneratePlanInput, LockedDrink } from "@/lib/generatePlan";
import {
  deriveRegenerationContext,
  type ConsumedSnapshot,
  type TimelineEntry,
} from "@/lib/sessionEngine";

/**
 * Pure request-accounting for plan generation.
 *
 * `target_ethanol_ml` is the remaining pure-ethanol budget for newly generated,
 * replaceable drinks. Any consumed or kept/locked ethanol has already been
 * subtracted by the caller; `locked_drinks` is informational context describing
 * drinks that must not be re-included in that remaining budget and is never
 * subtracted again downstream.
 */

export type LockedDrinkSource = {
  id: string;
  category: string;
  drink: string;
  customABV?: string;
  quantity: string;
  unit: DrinkUnit;
  isCustom?: boolean;
  customName?: string;
};

/**
 * Convert the user's locked drinks into the request's `locked_drinks` context.
 * Skips drinks that are not locked, or whose quantity or ABV is not a finite
 * positive number. Ethanol is derived from the existing client unit conversion
 * and catalog ABV data — never a new serving size or formula.
 */
export function lockedDrinkEntries(
  drinks: LockedDrinkSource[],
  lockedDrinkIds: string[],
  catalog: CatalogItem[]
): LockedDrink[] {
  const lockedIds = new Set(lockedDrinkIds);
  const entries: LockedDrink[] = [];
  for (const drink of drinks) {
    if (!lockedIds.has(drink.id)) continue;
    const quantity = parseFloat(drink.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const abv = drink.isCustom
      ? parseFloat(drink.customABV ?? "")
      : (catalog.find((c) => c.name === drink.drink)?.abv ?? 0);
    if (!Number.isFinite(abv) || abv < 0) continue;
    const catalogId =
      catalog.find((c) => c.name === drink.drink)?.id ?? `${drink.category}::${drink.drink}`;
    entries.push({
      catalog_id: catalogId,
      quantity,
      unit: drink.unit,
      ethanol_ml: convertToMl(quantity, drink.unit) * (abv / 100),
    });
  }
  return entries;
}

export function lockedEthanolTotal(entries: LockedDrink[]): number {
  return entries.reduce(
    (sum, entry) => sum + (Number.isFinite(entry.ethanol_ml) ? entry.ethanol_ml : 0),
    0
  );
}

/**
 * The ethanol budget for newly generated drinks. Clamped at zero; never
 * negative, NaN, or infinite.
 */
export function computeRemainingBudget(
  targetEthanolMl: number,
  lockedEthanolMl: number
): number {
  const budget = targetEthanolMl - lockedEthanolMl;
  if (!Number.isFinite(budget)) return 0;
  return Math.max(0, budget);
}

export function computeRegenerationBudget(input: {
  targetEthanolMl: number;
  timeline: TimelineEntry[];
  consumedSnapshots: ConsumedSnapshot[];
  lockedDrinkIds: string[];
  now: Date;
}): number {
  return deriveRegenerationContext({
    targetEthanolMl: input.targetEthanolMl,
    timeline: input.timeline,
    consumedSnapshots: input.consumedSnapshots,
    keptSourceIds: input.lockedDrinkIds,
    now: input.now,
  }).remainingEthanolMl;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    const record: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      record[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return record;
  }
  return value;
}

/**
 * Deterministic identity of a complete generation request: target budget,
 * duration, preferences, catalog, excludes, and the full locked-drink context.
 * Array order is significant — swapping two locked drinks changes the request.
 */
export function requestFingerprint(input: GeneratePlanInput): string {
  return JSON.stringify(canonicalize(input));
}

export type PlanningWindow = {
  start: Date;
  target: Date;
};

/**
 * If the start or target is absent, invalid, or the target is at/before `now`,
 * the planning window has expired: reset it to `now` → `now + durationMinutes`.
 * A target still in the future preserves the existing start and target. `now`
 * is always supplied by the caller — never inferred here.
 */
export function resolvePlanningWindow(
  start: Date | null,
  target: Date | null,
  durationMinutes: number,
  now: Date
): PlanningWindow {
  const startValid = start !== null && Number.isFinite(start.getTime());
  const targetValid = target !== null && Number.isFinite(target.getTime());
  if (!startValid || !targetValid || (target as Date).getTime() <= now.getTime()) {
    return {
      start: now,
      target: new Date(now.getTime() + durationMinutes * 60_000),
    };
  }
  return { start: start as Date, target: target as Date };
}
