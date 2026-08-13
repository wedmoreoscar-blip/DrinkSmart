import {
  computeRemainingBudget,
  lockedDrinkEntries,
  lockedEthanolTotal,
  type LockedDrinkSource,
} from "@/lib/planGenerationContracts";
import type { GeneratePlanInput, UserMetricsForCalc } from "@/lib/generatePlan";
import { parsePreferences, type PreferenceData } from "@/lib/preferences";

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
  drinks: LockedDrinkSource[];
  lockedDrinkIds: string[];
  drinkingStartTime: Date | null;
  drinkingTargetTime: Date | null;
};

/**
 * Build the same generation request PlanTab constructs and run it through the
 * planner (edge function with the greedy offline fallback). Consumed and
 * locked ethanol is subtracted from the budget via the shared contract
 * helpers; the caller decides how to merge the result.
 *
 * The planner and Supabase client are loaded lazily: importing this module
 * must be side-effect free, because it is imported from components that are
 * also exercised in non-browser test environments.
 */
export async function replanRemaining(input: ReplanInput): Promise<ReplanResult> {
  const {
    userMetrics,
    targetBAC,
    timeDeltaHours,
    drinks,
    lockedDrinkIds,
    drinkingStartTime,
    drinkingTargetTime,
  } = input;

  const [{ supabase }, { computeTargetEthanolMl, buildCatalog, generatePlan, generatedDrinkToEntry }] =
    await Promise.all([
      import("@/integrations/supabase/client"),
      import("@/lib/generatePlan"),
    ]);

  const targetEthanolMl = computeTargetEthanolMl(userMetrics, targetBAC, timeDeltaHours);
  if (targetEthanolMl === null) return { entries: null, usedFallback: false };

  const catalog = buildCatalog();
  const lockedEntries = lockedDrinkEntries(drinks, lockedDrinkIds, catalog);
  const lockedEthanolMl = lockedEthanolTotal(lockedEntries);
  const budget = computeRemainingBudget(targetEthanolMl, lockedEthanolMl);

  if (budget <= 0) return { entries: [], usedFallback: false };

  const preferences = await fetchPreferences(supabase);
  if (!preferences) return { entries: null, usedFallback: false };

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

async function fetchPreferences(
  supabase: typeof import("@/integrations/supabase/client").supabase
): Promise<PreferenceData | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return null;
  return parsePreferences(data.preferences);
}
