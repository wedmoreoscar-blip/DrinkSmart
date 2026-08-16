import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { getWeightInKg, getHeightInCm, getTBWGrams } from "@/lib/unitConversions";
import { getBACForLevel } from "@/data/buzzLevels";
import { clearSession, loadSession, saveSession } from "@/lib/sessionStore";
import {
  accumulateDelay,
  applyRegenerationToDrinks,
  calculateSessionTimeline,
  pruneStaleActionState,
  reorderRemainingTimeline,
  rescheduleTimeline,
  type AlcoholTimelineEntryInput,
  type BreakTimelineEntryInput,
  type ConsumedSnapshot,
  type DrinkCalculation,
  type TimelineEntry,
} from "@/lib/sessionEngine";
import { recordTimelineConsumption } from "@/lib/timelineConsumption";
import type { SessionSnapshot } from "@/lib/sessionHistory";
import {
  normalizeBudgetRange,
  WIDE_BUDGET_RANGE,
  type BudgetRange,
} from "@/lib/budget";
import { clearAnonymousOverrides } from "@/lib/anonymousOverrideStore";
import { clearAnonymousProfile } from "@/lib/anonymousProfileStore";

type MetricType = "bmi" | "ffmi";
type HeightUnit = "cm" | "ft";
type WeightUnit = "kg" | "lbs";

// W5-11: a session the user abandons is cleared six hours after its effective
// plan end. One named interval, used by the expiry scheduler below.
const SESSION_ABANDON_GRACE_MS = 6 * 60 * 60 * 1000;

type DrinkEntry = AlcoholTimelineEntryInput;

type BreakEntry = BreakTimelineEntryInput;

type DrinkTimelineEntry = TimelineEntry;

type UserMetrics = {
  metricType: MetricType;
  heightUnit: HeightUnit;
  weightUnit: WeightUnit;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  bodyFat: string;
  age: string;
  sex: "male" | "female" | "";
};

type AppState = {
  userMetrics: UserMetrics;
  inebriationLevel: number;
  targetBAC: { min: number; max: number }; // BAC range for selected inebriation level
  drinks: DrinkEntry[];
  lockedDrinkIds: string[]; // ids of drinks pinned across regenerations
  startTime: number; // seconds since start (deprecated)
  isTimerRunning: boolean; // deprecated
  startDateTime: Date | null; // actual start time
  drinkingStartTime: Date | null; // when user starts drinking
  drinkingTargetTime: Date | null; // when user wants to reach their buzz
  timeDelta: number | null; // difference between start and target time in hours (float)
  drinkTimeline: DrinkTimelineEntry[]; // calculated timeline entries
  drinkCalculations: DrinkCalculation[]; // calculation details for each drink
  adjustedTargetMl: number | null; // adjusted target when drinks exceed 100%
  isTargetAdjusted: boolean; // whether target was adjusted
  breaks: BreakEntry[]; // duration-bearing breaks, no ethanol contribution
  consumedTimelineEntries: ConsumedSnapshot[]; // logged consumptions keyed by entry id
  delayedEntryMinutes: Record<string, number>; // accumulated delay minutes keyed by entry id
  effectivePlanEndTime: Date | null; // derived plan end, recomputed never persisted
  budget: BudgetRange; // the night's money range; belongs to the session, not the user
};

type AppContextType = {
  state: AppState;
  updateUserMetrics: (metrics: Partial<UserMetrics>) => void;
  updateInebriationLevel: (level: number) => void;
  updateBudget: (budget: BudgetRange) => void;
  updateDrinks: (drinks: DrinkEntry[]) => void;
  updateTimeline: (startTime: number, isRunning: boolean) => void;
  updateStartTime: (startTime: Date) => void;
  updateDrinkingStartTime: (time: Date | null) => void;
  updateDrinkingTargetTime: (time: Date | null) => void;
  toggleLockedDrink: (drinkId: string) => void;
  clearLockedDrinks: () => void;
  recalculate: () => void;
  calculateDrinkTimeline: () => void;
  reorderTimelineEntries: (oldIndex: number, newIndex: number) => void;
  markTimelineEntryHadIt: (entryId: string, consumedAt?: Date) => void;
  delayTimelineEntry: (entryId: string, minutes?: number) => void;
  addUnplannedDrink: (drink: DrinkEntry) => void;
  rescheduleRemainingTimeline: (now?: Date) => void;
  applyRegeneratedRemainingDrinks: (generatedDrinks: DrinkEntry[], now?: Date) => void;
  replaceBreakWithDrink: (breakEntryId: string, drink: DrinkEntry, now?: Date) => void;
  endSession: (now?: Date) => void;
  loadSessionSnapshot: (snapshot: SessionSnapshot, now?: Date) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialState: AppState = {
  userMetrics: {
    metricType: "bmi",
    heightUnit: "cm",
    weightUnit: "kg",
    heightCm: "",
    heightFt: "",
    heightIn: "",
    weight: "",
    bodyFat: "",
    age: "",
    sex: "",
  },
  inebriationLevel: 3,
  targetBAC: { min: 0.06, max: 0.09 }, // Default to level 3 (Tipsy)
  drinks: [{ id: "1", category: "", drink: "", quantity: "", unit: "ml", isCustom: false }],
  lockedDrinkIds: [],
  startTime: 0,
  isTimerRunning: false,
  startDateTime: null,
  drinkingStartTime: null,
  drinkingTargetTime: null,
  timeDelta: null,
  drinkTimeline: [],
  drinkCalculations: [],
  adjustedTargetMl: null,
  isTargetAdjusted: false,
  breaks: [],
  consumedTimelineEntries: [],
  delayedEntryMinutes: {},
  effectivePlanEndTime: null,
  budget: { ...WIDE_BUDGET_RANGE },
};

/**
 * Clear the completed night's data while retaining profile choices and the
 * selected duration for the next plan. Absolute times belong to one session,
 * so the next window starts from the supplied current time.
 */
function resetActiveSessionState(prev: AppState, now: Date): AppState {
  const durationHours =
    prev.timeDelta !== null && Number.isFinite(prev.timeDelta) && prev.timeDelta > 0
      ? prev.timeDelta
      : null;

  return {
    ...prev,
    drinks: initialState.drinks.map((drink) => ({ ...drink })),
    lockedDrinkIds: [],
    startTime: 0,
    isTimerRunning: false,
    startDateTime: null,
    drinkingStartTime: new Date(now),
    drinkingTargetTime:
      durationHours === null ? null : new Date(now.getTime() + durationHours * 60 * 60 * 1000),
    timeDelta: durationHours,
    drinkTimeline: [],
    drinkCalculations: [],
    adjustedTargetMl: null,
    isTargetAdjusted: false,
    breaks: [],
    consumedTimelineEntries: [],
    delayedEntryMinutes: {},
    effectivePlanEndTime: null,
    // A budget describes one evening, not the drinker, so the next night
    // starts maximally wide rather than inheriting this one's band. Duration
    // is retained above because it is a habit; what you will spend is not.
    budget: { ...WIDE_BUDGET_RANGE },
  };
}

function loadSessionSnapshotState(
  prev: AppState,
  snapshot: SessionSnapshot,
  now: Date,
): AppState {
  const buzzLevel = Math.max(1, Math.min(snapshot.buzz_level, 7));
  const bacRange = getBACForLevel(buzzLevel);
  const durationMinutes =
    Number.isFinite(snapshot.duration_minutes) && snapshot.duration_minutes > 0
      ? snapshot.duration_minutes
      : 180;
  const clonedDrinks = snapshot.drinks.map((drink) => ({
    ...drink,
    id: crypto.randomUUID(),
  }));

  return {
    ...prev,
    inebriationLevel: buzzLevel,
    targetBAC: { min: bacRange.min_bac, max: bacRange.max_bac },
    drinks:
      clonedDrinks.length > 0
        ? clonedDrinks
        : initialState.drinks.map((drink) => ({ ...drink })),
    lockedDrinkIds: [],
    startTime: 0,
    isTimerRunning: false,
    startDateTime: null,
    drinkingStartTime: new Date(now),
    drinkingTargetTime: new Date(now.getTime() + durationMinutes * 60_000),
    timeDelta: durationMinutes / 60,
    drinkTimeline: [],
    drinkCalculations: [],
    adjustedTargetMl: null,
    isTargetAdjusted: false,
    breaks: [],
    consumedTimelineEntries: [],
    delayedEntryMinutes: {},
    effectivePlanEndTime: null,
    // `use last night` brings the band back with the rest of the settings. A
    // snapshot saved before the columns existed carries nulls and restores
    // wide, which is what that night effectively had.
    budget: normalizeBudgetRange(snapshot.budget_min, snapshot.budget_max),
  };
}

/**
 * Re-derive the abandonment deadline from the persisted plan inputs on the
 * plan's original clock. The live presentation rescheduler floors flexible
 * rows at `now`; using that now-shifted end after a reload would manufacture a
 * fresh future deadline for an already-stale session.
 */
function deriveAbandonedSessionExpiryAt(state: AppState): Date | null {
  const fallbackEnd = state.effectivePlanEndTime;
  if (!fallbackEnd) return null;

  let stableEnd = fallbackEnd;
  if (
    state.drinkingStartTime &&
    state.timeDelta !== null &&
    Number.isFinite(state.timeDelta)
  ) {
    const base = calculateSessionTimeline({
      entries: [...state.drinks, ...state.breaks],
      userMetrics: state.userMetrics,
      targetBAC: state.targetBAC,
      timeDeltaHours: state.timeDelta,
      drinkingStartTime: state.drinkingStartTime,
    });
    stableEnd =
      rescheduleTimeline({
        timeline: base.drinkTimeline,
        consumed: state.consumedTimelineEntries,
        delayedMinutes: state.delayedEntryMinutes,
        now: state.drinkingStartTime,
        targetEndTime: state.drinkingTargetTime,
      }).effectivePlanEndTime ?? fallbackEnd;
  }

  return new Date(stableEnd.getTime() + SESSION_ABANDON_GRACE_MS);
}

/**
 * The stats the Widmark engine actually reads. A change to any of them means
 * the target was computed for a different body; a change to anything else on
 * the profile does not.
 */
const BAC_RELEVANT_METRIC_KEYS = [
  "metricType",
  "heightUnit",
  "weightUnit",
  "heightCm",
  "heightFt",
  "heightIn",
  "weight",
  "bodyFat",
  "age",
  "sex",
] as const satisfies readonly (keyof UserMetrics)[];

/**
 * Whether these stats can produce a target at all. The engine needs a weight
 * and a sex; without them there is nothing to invalidate.
 */
function statsAreUsable(metrics: UserMetrics): boolean {
  return metrics.weight.trim() !== "" && metrics.sex !== "";
}

/**
 * Replace the planned drinks when the user's body stats materially change.
 *
 * A plan is a set of drinks chosen to reach a target computed from a body. If
 * the body changes the target moves but the drinks do not, which is how a plan
 * ends up reading 226 ml against a 127 ml target — over the tray's ceiling,
 * with no way to see why.
 *
 * Two things are deliberately kept. **Consumed drinks survive**: they already
 * happened, and no stats edit un-drinks them. **The night survives** — buzz
 * level, duration and the drinking window are choices about the evening, not
 * about the body. A lock does not protect a drink here: locks stop
 * regeneration and nothing else (`docs/decisions.md`).
 *
 * The first population is not a change. `MetricsSync` pushes stats in after
 * the profile loads, so treating empty-to-populated as material would wipe the
 * plan on every page load — the exact bug this is meant to fix.
 */
function applyChangedStatsToPlanState(prev: AppState, next: UserMetrics): AppState {
  const materiallyChanged = BAC_RELEVANT_METRIC_KEYS.some(
    (key) => prev.userMetrics[key] !== next[key],
  );
  if (!statsAreUsable(prev.userMetrics) || !materiallyChanged) {
    return { ...prev, userMetrics: next };
  }

  const protectedSourceIds = prev.consumedTimelineEntries.map(
    (snapshot) => snapshot.sourceDrinkId,
  );
  const retained = applyRegenerationToDrinks(prev.drinks, protectedSourceIds, []);
  const drinks =
    retained.length === 0 ? initialState.drinks.map((drink) => ({ ...drink })) : retained;
  const pruned = pruneStaleActionState(drinks, {
    consumed: prev.consumedTimelineEntries,
    delayed: prev.delayedEntryMinutes,
    locked: prev.lockedDrinkIds,
  });

  return {
    ...prev,
    userMetrics: next,
    drinks,
    lockedDrinkIds: pruned.locked,
    consumedTimelineEntries: pruned.consumed,
    delayedEntryMinutes: pruned.delayed,
    drinkTimeline: [],
    drinkCalculations: [],
    adjustedTargetMl: null,
    isTargetAdjusted: false,
    effectivePlanEndTime: null,
  };
}

export const appSessionStateTransitions = {
  applyChangedStatsToPlanState,
  resetActiveSessionState,
  loadSessionSnapshotState,
  deriveAbandonedSessionExpiryAt,
};

function hydrateInitialState(): AppState {
  const persisted = loadSession();
  if (!persisted) return initialState;

  let targetBAC = initialState.targetBAC;
  try {
    const bac = getBACForLevel(persisted.inebriationLevel);
    targetBAC = { min: bac.min_bac, max: bac.max_bac };
  } catch {
    // Unknown level — keep default
  }

  let timeDelta: number | null = null;
  if (persisted.drinkingStartTime && persisted.drinkingTargetTime) {
    const startMin =
      persisted.drinkingStartTime.getHours() * 60 +
      persisted.drinkingStartTime.getMinutes();
    const targetMin =
      persisted.drinkingTargetTime.getHours() * 60 +
      persisted.drinkingTargetTime.getMinutes();
    const diff =
      targetMin <= startMin
        ? 24 * 60 - startMin + targetMin
        : targetMin - startMin;
    timeDelta = diff / 60;
  }

  return {
    ...initialState,
    inebriationLevel: persisted.inebriationLevel,
    targetBAC,
    drinks:
      persisted.drinks.length > 0 ? persisted.drinks : initialState.drinks,
    lockedDrinkIds: persisted.lockedDrinkIds,
    drinkingStartTime: persisted.drinkingStartTime,
    drinkingTargetTime: persisted.drinkingTargetTime,
    timeDelta,
    breaks: persisted.breaks.map((breakEntry) => ({ kind: "break" as const, ...breakEntry })),
    consumedTimelineEntries: persisted.consumedTimelineEntries,
    delayedEntryMinutes: persisted.delayedEntryMinutes,
    budget: persisted.budget,
  };
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(hydrateInitialState);

  // Persist the night-state slice to localStorage on change (debounced inside saveSession).
  useEffect(() => {
    saveSession({
      inebriationLevel: state.inebriationLevel,
      drinks: state.drinks,
      lockedDrinkIds: state.lockedDrinkIds,
      drinkingStartTime: state.drinkingStartTime,
      drinkingTargetTime: state.drinkingTargetTime,
      breaks: state.breaks,
      consumedTimelineEntries: state.consumedTimelineEntries,
      delayedEntryMinutes: state.delayedEntryMinutes,
      budget: state.budget,
    });
  }, [
    state.inebriationLevel,
    state.drinks,
    state.lockedDrinkIds,
    state.drinkingStartTime,
    state.drinkingTargetTime,
    state.breaks,
    state.consumedTimelineEntries,
    state.delayedEntryMinutes,
    state.budget,
  ]);

  const updateUserMetrics = useCallback((metrics: Partial<UserMetrics>) => {
    setState((prev) =>
      applyChangedStatsToPlanState(prev, { ...prev.userMetrics, ...metrics }),
    );
  }, []);

  const updateInebriationLevel = (level: number) => {
    const bacRange = getBACForLevel(level);
    setState((prev) => ({
      ...prev,
      inebriationLevel: level,
      targetBAC: { min: bacRange.min_bac, max: bacRange.max_bac },
    }));
  };

  const updateBudget = useCallback((budget: BudgetRange) => {
    setState((prev) => {
      const next = normalizeBudgetRange(budget.min, budget.max);
      if (next.min === prev.budget.min && next.max === prev.budget.max) return prev;
      return { ...prev, budget: next };
    });
  }, []);

  const updateDrinks = (drinks: DrinkEntry[]) => {
    setState((prev) => {
      const pruned = pruneStaleActionState(drinks, {
        consumed: prev.consumedTimelineEntries,
        delayed: prev.delayedEntryMinutes,
        locked: prev.lockedDrinkIds,
      });
      return {
        ...prev,
        drinks,
        lockedDrinkIds: [
          ...pruned.locked,
          ...prev.lockedDrinkIds.filter((id) => prev.breaks.some((entry) => entry.entryId === id)),
        ],
        consumedTimelineEntries: pruned.consumed,
        delayedEntryMinutes: pruned.delayed,
      };
    });
  };

  const updateTimeline = (startTime: number, isRunning: boolean) => {
    setState((prev) => ({ ...prev, startTime, isTimerRunning: isRunning }));
  };

  const updateStartTime = (startTime: Date) => {
    setState((prev) => ({ ...prev, startDateTime: startTime }));
  };

  const calculateTimeDelta = (startTime: Date | null, targetTime: Date | null): number | null => {
    if (!startTime || !targetTime) return null;
    
    const startHour = startTime.getHours();
    const startMinutes = startTime.getMinutes();
    const targetHour = targetTime.getHours();
    const targetMinutes = targetTime.getMinutes();
    
    // Convert times to total minutes for easier calculation
    const startTotalMinutes = startHour * 60 + startMinutes;
    const targetTotalMinutes = targetHour * 60 + targetMinutes;
    
    let diffMinutes: number;
    
    // If target time is earlier in the day than start time, it's the next day
    if (targetTotalMinutes <= startTotalMinutes) {
      // Calculate time to midnight + time from midnight to target
      diffMinutes = (24 * 60 - startTotalMinutes) + targetTotalMinutes;
    } else {
      // Same day calculation
      diffMinutes = targetTotalMinutes - startTotalMinutes;
    }
    
    return diffMinutes / 60; // Convert to hours
  };

  const updateDrinkingStartTime = (time: Date | null) => {
    setState((prev) => {
      const timeDelta = calculateTimeDelta(time, prev.drinkingTargetTime);
      return { ...prev, drinkingStartTime: time, timeDelta };
    });
  };

  const toggleLockedDrink = (drinkId: string) => {
    setState((prev) => ({
      ...prev,
      lockedDrinkIds: prev.lockedDrinkIds.includes(drinkId)
        ? prev.lockedDrinkIds.filter((id) => id !== drinkId)
        : [...prev.lockedDrinkIds, drinkId],
    }));
  };

  const clearLockedDrinks = () => {
    setState((prev) => ({ ...prev, lockedDrinkIds: [] }));
  };

  const updateDrinkingTargetTime = (time: Date | null) => {
    setState((prev) => {
      const timeDelta = calculateTimeDelta(prev.drinkingStartTime, time);
      return { ...prev, drinkingTargetTime: time, timeDelta };
    });
  };

  const recalculate = () => {
    // This will trigger recalculation in the Results tab
    console.log("Recalculating with current state:", state);
  };

  const reorderTimelineEntries = (oldIndex: number, newIndex: number) => {
    setState((prev) => {
      const drinkTimeline = reorderRemainingTimeline(
        prev.drinkTimeline,
        oldIndex,
        newIndex,
        new Date(),
        prev.consumedTimelineEntries
      );
      return drinkTimeline === prev.drinkTimeline ? prev : { ...prev, drinkTimeline };
    });
  };

  const computeSessionTimeline = (prev: AppState, now: Date): AppState => {
    const { userMetrics, targetBAC, timeDelta, drinks, drinkingStartTime, drinkingTargetTime } = prev;

    // Check if we have required data (different requirements for FFM vs BMI mode)
    if (!userMetrics.weight || timeDelta === null || !drinkingStartTime) {
      return { ...prev, drinkTimeline: [], drinkCalculations: [], effectivePlanEndTime: null };
    }

    const weightKg = getWeightInKg(userMetrics.weight, userMetrics.weightUnit);
    const heightCm = getHeightInCm(
      userMetrics.heightCm,
      userMetrics.heightFt,
      userMetrics.heightIn,
      userMetrics.heightUnit
    );

    if (!weightKg) {
      return { ...prev, drinkTimeline: [], drinkCalculations: [], effectivePlanEndTime: null };
    }

    const tbwGrams = getTBWGrams({
      metricType: userMetrics.metricType,
      bodyFat: userMetrics.bodyFat,
      age: userMetrics.age,
      heightCm,
      weightKg,
      sex: userMetrics.sex,
    });

    if (!tbwGrams) {
      return { ...prev, drinkTimeline: [], drinkCalculations: [], effectivePlanEndTime: null };
    }

    const base = calculateSessionTimeline({
      entries: [...drinks, ...prev.breaks],
      userMetrics,
      targetBAC,
      timeDeltaHours: timeDelta,
      drinkingStartTime,
    });

    const rescheduled = rescheduleTimeline({
      timeline: base.drinkTimeline,
      consumed: prev.consumedTimelineEntries,
      delayedMinutes: prev.delayedEntryMinutes,
      now,
      targetEndTime: drinkingTargetTime,
    });

    return {
      ...prev,
      drinkCalculations: base.drinkCalculations,
      drinkTimeline: rescheduled.timeline,
      adjustedTargetMl: base.adjustedTargetMl,
      isTargetAdjusted: base.isTargetAdjusted,
      effectivePlanEndTime: rescheduled.effectivePlanEndTime,
    };
  };

  const calculateDrinkTimeline = () => {
    setState((prev) => computeSessionTimeline(prev, new Date()));
  };

  const markTimelineEntryHadIt = (entryId: string, consumedAt?: Date) => {
    setState((prev) => {
      // Consumption changes presentation and BAC accounting, not the night's
      // agreed clock. Re-planning and +15 are the only actions that retime it.
      return recordTimelineConsumption(prev, entryId, consumedAt ?? new Date());
    });
  };

  const delayTimelineEntry = (entryId: string, minutes?: number) => {
    setState((prev) => {
      const entry = prev.drinkTimeline.find((candidate) => candidate.entryId === entryId);
      if (!entry) return prev;
      if (prev.consumedTimelineEntries.some((snapshot) => snapshot.entryId === entryId)) {
        return prev;
      }
      const delayedEntryMinutes = accumulateDelay(
        prev.delayedEntryMinutes,
        entryId,
        minutes ?? 15
      );
      if (delayedEntryMinutes === prev.delayedEntryMinutes) return prev;
      return computeSessionTimeline({ ...prev, delayedEntryMinutes }, new Date());
    });
  };

  const addUnplannedDrink = (drink: DrinkEntry) => {
    setState((prev) => {
      if (prev.drinks.some((existing) => existing.id === drink.id)) return prev;
      const next = {
        ...prev,
        drinks: [...prev.drinks, drink],
      };
      return computeSessionTimeline(next, new Date());
    });
  };

  const rescheduleRemainingTimeline = (now?: Date) => {
    setState((prev) => computeSessionTimeline(prev, now ?? new Date()));
  };

  const applyRegeneratedRemainingDrinks = (generatedDrinks: DrinkEntry[], now?: Date) => {
    setState((prev) => {
      const protectedSourceIds = [
        ...prev.lockedDrinkIds,
        ...prev.consumedTimelineEntries.map((snapshot) => snapshot.sourceDrinkId),
      ];
      const drinks = applyRegenerationToDrinks(prev.drinks, protectedSourceIds, generatedDrinks);
      const pruned = pruneStaleActionState(drinks, {
        consumed: prev.consumedTimelineEntries,
        delayed: prev.delayedEntryMinutes,
        locked: prev.lockedDrinkIds,
      });
      return computeSessionTimeline(
        {
          ...prev,
          drinks,
          lockedDrinkIds: [
            ...pruned.locked,
            ...prev.lockedDrinkIds.filter((id) =>
              prev.breaks.some((entry) => entry.entryId === id)
            ),
          ],
          consumedTimelineEntries: pruned.consumed,
          delayedEntryMinutes: pruned.delayed,
        },
        now ?? new Date()
      );
    });
  };

  const replaceBreakWithDrink = (breakEntryId: string, drink: DrinkEntry, now?: Date) => {
    setState((prev) => {
      if (!prev.breaks.some((entry) => entry.entryId === breakEntryId)) return prev;
      return computeSessionTimeline(
        {
          ...prev,
          breaks: prev.breaks.filter((entry) => entry.entryId !== breakEntryId),
          drinks: [...prev.drinks, { ...drink, id: breakEntryId }],
        },
        now ?? new Date()
      );
    });
  };

  const endSession = (now?: Date) => {
    // Remove the completed session immediately so a reload cannot restore it
    // during saveSession's debounce window. The state effect then persists the
    // new blank session.
    clearSession();
    // An anonymous user's remembered prices, serves, stats and preferences
    // belong to the night, not to the device — without this the localStorage
    // record simply survives, which is the behaviour the account switch exists
    // to remove. An account's data lives in Postgres and is untouched by this.
    clearAnonymousOverrides();
    clearAnonymousProfile();
    setState((prev) => resetActiveSessionState(prev,now ?? new Date()));
  };

  const expireAbandonedSession = useCallback(() => {
    // Same debounce-race protection as endSession: clear the persisted
    // session before resetting state, then the persist effect writes the
    // fresh blank session. No account history snapshot is written.
    clearSession();
    // An anonymous user's remembered prices, serves, stats and preferences
    // belong to the night, not to the device — without this the localStorage
    // record simply survives, which is the behaviour the account switch exists
    // to remove. An account's data lives in Postgres and is untouched by this.
    clearAnonymousOverrides();
    clearAnonymousProfile();
    setState((prev) => resetActiveSessionState(prev,new Date()));
  }, []);

  // Expire an abandoned session six hours after its effective plan end. The
  // timer is rescheduled whenever the deterministic rescheduler moves
  // effectivePlanEndTime (+15, delays), and a deadline already past — e.g.
  // right after a persisted abandoned session hydrates and its timeline is
  // recomputed — expires immediately. Consumption alone never triggers it.
  useEffect(() => {
    const expiryAt = deriveAbandonedSessionExpiryAt(state);
    if (!expiryAt) return;
    const delay = expiryAt.getTime() - Date.now();
    if (delay <= 0) {
      expireAbandonedSession();
      return;
    }
    const timer = setTimeout(expireAbandonedSession, delay);
    return () => clearTimeout(timer);
  }, [state, expireAbandonedSession]);

  const loadSessionSnapshot = (snapshot: SessionSnapshot, now?: Date) => {
    // A saved snapshot becomes a clean, editable draft: the current drinks are
    // replaced (never merged) with clones carrying collision-safe source ids,
    // and every consumption/lock/timing artifact of the previous session is
    // cleared. The saved duration is rebased from the supplied current time.
    const currentTime = now ?? new Date();
    setState((prev) => loadSessionSnapshotState(prev, snapshot, currentTime));
  };

  // Auto-recalculate timeline when dependencies change
  useEffect(() => {
    calculateDrinkTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.drinks,
    state.breaks,
    state.userMetrics.weight,
    state.userMetrics.weightUnit,
    state.userMetrics.heightCm,
    state.userMetrics.heightFt,
    state.userMetrics.heightIn,
    state.userMetrics.heightUnit,
    state.userMetrics.age,
    state.userMetrics.sex,
    state.userMetrics.metricType,
    state.userMetrics.bodyFat,
    state.timeDelta,
    state.drinkingStartTime,
    state.targetBAC,
  ]);

  return (
    <AppContext.Provider
      value={{
        state,
        updateUserMetrics,
        updateInebriationLevel,
        updateBudget,
        updateDrinks,
        updateTimeline,
        updateStartTime,
        updateDrinkingStartTime,
        updateDrinkingTargetTime,
        toggleLockedDrink,
        clearLockedDrinks,
        recalculate,
        calculateDrinkTimeline,
        reorderTimelineEntries,
        markTimelineEntryHadIt,
        delayTimelineEntry,
        addUnplannedDrink,
        rescheduleRemainingTimeline,
        applyRegeneratedRemainingDrinks,
        replaceBreakWithDrink,
        endSession,
        loadSessionSnapshot,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
};
