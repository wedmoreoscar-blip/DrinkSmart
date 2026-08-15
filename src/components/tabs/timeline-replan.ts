import {
  computeRegenerationBudget,
  lockedDrinkEntries,
  type LockedDrinkSource,
} from "@/lib/planGenerationContracts";
import type { GeneratePlanInput, UserMetricsForCalc } from "@/lib/generatePlan";
import {
  computeTargetEthanolMl,
  generatePlan,
  generatedDrinkToEntry,
} from "@/lib/generatePlan";
import type { CatalogItem } from "@/lib/planCatalog";
import type { PreferenceData } from "@/lib/preferences";
import {
  type ConsumedSnapshot,
  type TimelineEntry,
} from "@/lib/sessionEngine";

const DEFAULT_DURATION_MINUTES = 180;
const MIN_DURATION = 60;
const MAX_DURATION = 480;

export type TimelineSortableEntry = {
  kind?: "alcohol" | "break";
  drinkId: string;
  entryId: string;
  unitNumber: number;
};

/**
 * Stable drag identity for one timeline row. Breaks have no drink id, so they
 * are keyed by their entry id instead.
 */
export function sortableIdFor(entry: TimelineSortableEntry): string {
  return entry.kind === "break" ? `break:${entry.entryId}` : `${entry.drinkId}-${entry.unitNumber}`;
}

function deriveDurationMinutes(start: Date | null, target: Date | null): number {
  if (!start || !target) return DEFAULT_DURATION_MINUTES;
  const startMin = start.getHours() * 60 + start.getMinutes();
  const targetMin = target.getHours() * 60 + target.getMinutes();
  const diff =
    targetMin <= startMin ? 24 * 60 - startMin + targetMin : targetMin - startMin;
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, diff || DEFAULT_DURATION_MINUTES));
}

export type ReplanResult = {
  /**
   * Generated DrinkEntry replacements. null when the profile is incomplete and
   * nothing should be applied; an empty array means everything replaceable was
   * removed (budget fully covered by locked/consumed ethanol, mirroring
   * PlanTab's empty-plan branch).
   */
  entries: GeneratedEntry[] | null;
  usedFallback: boolean;
};

type GeneratedEntry = {
  id: string;
  category: string;
  drink: string;
  customABV: string;
  quantity: string;
  unit: "ml" | "oz" | "shots" | "pints" | "glass";
  isCustom: boolean;
  portions?: number;
};

type ReplanInput = {
  userMetrics: UserMetricsForCalc;
  targetBAC: { min: number; max: number };
  timeDeltaHours: number | null;
  preferences: PreferenceData;
  drinks: LockedDrinkSource[];
  lockedDrinkIds: string[];
  drinkingStartTime: Date | null;
  drinkingTargetTime: Date | null;
  timeline: TimelineEntry[];
  consumedSnapshots: ConsumedSnapshot[];
  catalog: CatalogItem[];
  now: Date;
};

export function remainingReplanBudget(input: {
  targetEthanolMl: number;
  timeline: TimelineEntry[];
  consumedSnapshots: ConsumedSnapshot[];
  lockedDrinkIds: string[];
  now: Date;
}): number {
  return computeRegenerationBudget({
    targetEthanolMl: input.targetEthanolMl,
    timeline: input.timeline,
    consumedSnapshots: input.consumedSnapshots,
    lockedDrinkIds: input.lockedDrinkIds,
    now: input.now,
  });
}

/**
 * Build the same generation request PlanTab constructs and run it through the
 * planner (edge function with the greedy offline fallback). Consumed and
 * locked ethanol is subtracted from the budget via the shared contract
 * helpers; the caller decides how to merge the result. Preferences come from
 * the caller's live application state — never a fresh profile read.
 */
export async function replanRemaining(input: ReplanInput): Promise<ReplanResult> {
  const {
    userMetrics,
    targetBAC,
    timeDeltaHours,
    preferences,
    drinks,
    lockedDrinkIds,
    drinkingStartTime,
    drinkingTargetTime,
    timeline,
    consumedSnapshots,
    catalog,
    now,
  } = input;

  const targetEthanolMl = computeTargetEthanolMl(userMetrics, targetBAC, timeDeltaHours);
  if (targetEthanolMl === null) return { entries: null, usedFallback: false };

  const lockedEntries = lockedDrinkEntries(drinks, lockedDrinkIds, catalog);
  const budget = remainingReplanBudget({
    targetEthanolMl,
    timeline,
    consumedSnapshots,
    lockedDrinkIds,
    now,
  });

  if (budget <= 0) return { entries: [], usedFallback: false };

  const request: GeneratePlanInput = {
    target_ethanol_ml: budget,
    duration_minutes: deriveDurationMinutes(drinkingStartTime, drinkingTargetTime),
    preferences,
    catalog,
    locked_drinks: lockedEntries,
    exclude: [],
  };

  const plan = await generatePlan(request);
  const entries = plan.drinks
    .map((generated) => generatedDrinkToEntry(generated, catalog))
    .filter((entry): entry is GeneratedEntry => entry !== null);

  return { entries, usedFallback: plan.usedFallback };
}
