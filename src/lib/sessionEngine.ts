/**
 * Deterministic session engine: pure timeline calculation, break handling,
 * rescheduling around protected anchors, regeneration accounting, session
 * phase, and wind-down estimates.
 *
 * This module never calls Date.now(), timers, storage, React, browser,
 * Supabase, or model code. Every time-sensitive function receives explicit
 * dates. It performs no catalog selection and never trusts model arithmetic.
 */
import { getWeightInKg, getHeightInCm, getTBWGrams } from "@/lib/unitConversions";
import { convertToMl, getDrinkIcon, calculateTimeWithMidnight } from "@/lib/timelineHelpers";
import { drinkCategories } from "@/data/drinksData";

export type EngineUserMetrics = {
  metricType: "bmi" | "ffmi";
  heightUnit: "cm" | "ft";
  weightUnit: "kg" | "lbs";
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  bodyFat: string;
  age: string;
  sex: "male" | "female" | "";
};

export type AlcoholTimelineEntryInput = {
  kind?: "alcohol";
  id: string;
  category: string;
  drink: string;
  customABV?: string;
  quantity: string;
  unit: "ml" | "oz" | "shots" | "pints" | "glass";
  mixer?: string;
  mixerQuantity?: string;
  mixerUnit?: "ml" | "oz" | "shots" | "pints" | "glass";
  isCustom?: boolean;
  customName?: string;
  pricePerUnit?: number | null;
  portions?: number;
};

export type BreakTimelineEntryInput = {
  kind: "break";
  entryId: string;
  durationMinutes: number;
  volumeMl?: number;
  drinkName: string;
};

export type TimelineEntryInput = AlcoholTimelineEntryInput | BreakTimelineEntryInput;

/**
 * Deterministic stable identity of one timeline unit. Derived from the
 * persisted source drink id and unit number so it survives recalculation
 * and reload.
 */
export function timelineEntryId(sourceDrinkId: string, unitNumber: number): string {
  return `${sourceDrinkId}:unit:${unitNumber}`;
}

export function sourceDrinkIdFromEntryId(entryId: string): string | null {
  const index = entryId.indexOf(":unit:");
  if (index <= 0) return null;
  return entryId.slice(0, index);
}

export type DrinkCalculation = {
  drinkId: string;
  drinkName: string;
  totalVolumeMl: number;
  pureAlcoholMl: number;
  percentageOfTarget: number;
  timeAllocatedMinutes: number;
  intervalMinutes: number;
  quantity: number;
  unit: string;
};

export type AlcoholTimelineEntry = {
  kind: "alcohol";
  entryId: string;
  drinkId: string;
  drinkName: string;
  unitNumber: number;
  totalUnits: number;
  time: Date;
  pureAlcoholMl: number;
  percentageOfTarget: number;
  icon: string;
  unit: string;
  intervalMinutes: number;
};

export type BreakTimelineEntry = {
  kind: "break";
  entryId: string;
  drinkId: "";
  drinkName: string;
  unitNumber: 0;
  totalUnits: 0;
  time: Date;
  pureAlcoholMl: 0;
  percentageOfTarget: 0;
  icon: "";
  unit: "";
  durationMinutes: number;
  volumeMl?: number;
};

export type TimelineEntry = AlcoholTimelineEntry | BreakTimelineEntry;

export type SessionTimelineResult = {
  drinkCalculations: DrinkCalculation[];
  drinkTimeline: TimelineEntry[];
  adjustedTargetMl: number | null;
  isTargetAdjusted: boolean;
};

export type CalculateSessionTimelineInput = {
  entries: TimelineEntryInput[];
  userMetrics: EngineUserMetrics;
  targetBAC: { min: number; max: number };
  timeDeltaHours: number;
  drinkingStartTime: Date;
};

type TimelineSlot =
  | { kind: "alcohol"; calc: DrinkCalculation }
  | { kind: "break"; entry: BreakTimelineEntryInput };

function isValidBreak(entry: BreakTimelineEntryInput): boolean {
  return Number.isFinite(entry.durationMinutes) && entry.durationMinutes > 0;
}

export function calculateSessionTimeline(
  input: CalculateSessionTimelineInput
): SessionTimelineResult {
  const { entries, userMetrics, targetBAC, timeDeltaHours, drinkingStartTime } = input;

  const weightKg = getWeightInKg(userMetrics.weight, userMetrics.weightUnit);
  if (!weightKg) {
    return {
      drinkCalculations: [],
      drinkTimeline: [],
      adjustedTargetMl: null,
      isTargetAdjusted: false,
    };
  }
  const heightCm = getHeightInCm(
    userMetrics.heightCm,
    userMetrics.heightFt,
    userMetrics.heightIn,
    userMetrics.heightUnit
  );
  const tbwGrams = getTBWGrams({
    metricType: userMetrics.metricType,
    bodyFat: userMetrics.bodyFat,
    age: userMetrics.age,
    heightCm,
    weightKg,
    sex: userMetrics.sex,
  });
  if (!tbwGrams) {
    return {
      drinkCalculations: [],
      drinkTimeline: [],
      adjustedTargetMl: null,
      isTargetAdjusted: false,
    };
  }

  const allDrinks = Object.entries(drinkCategories).flatMap(([categoryKey, category]) =>
    category.options.map((option) => ({
      name: option.name,
      abv: option.abv,
      category: categoryKey,
    }))
  );

  const BAC = (targetBAC.min + targetBAC.max) / 2;
  const pureAlcoholGrams = (BAC / 100 + 0.00015 * timeDeltaHours) * tbwGrams;
  const targetEthanolMl = pureAlcoholGrams / 0.789;

  const totalTimeDeltaMinutes = timeDeltaHours * 60;
  const reservedBreakMinutes = entries.reduce((sum, entry) => {
    if (entry.kind !== "break" || !isValidBreak(entry)) return sum;
    return sum + entry.durationMinutes;
  }, 0);
  const alcoholTimeBudgetMinutes = Math.max(0, totalTimeDeltaMinutes - reservedBreakMinutes);

  const slots: TimelineSlot[] = [];
  for (const entry of entries) {
    if (entry.kind === "break") {
      if (isValidBreak(entry)) slots.push({ kind: "break", entry });
      continue;
    }
    if (!entry.quantity) continue;
    if (!entry.isCustom && !entry.drink) continue;
    if (entry.isCustom && (!entry.customName || !entry.customABV)) continue;
    const quantity = parseFloat(entry.quantity);
    if (isNaN(quantity) || quantity <= 0) continue;

    const volumeMl = convertToMl(quantity, entry.unit);

    let abv = 0;
    if (entry.customABV) {
      abv = parseFloat(entry.customABV);
    } else if (!entry.isCustom) {
      const drinkData = allDrinks.find((d) => d.name === entry.drink);
      abv = drinkData?.abv || 0;
    }

    const pureAlcoholMl = volumeMl * (abv / 100);

    let timelineQuantity: number;
    if (entry.unit === "ml" || entry.unit === "oz") {
      timelineQuantity = entry.portions && entry.portions > 1 ? entry.portions : 1;
    } else {
      timelineQuantity = quantity;
    }

    slots.push({
      kind: "alcohol",
      calc: {
        drinkId: entry.id,
        drinkName: entry.isCustom ? entry.customName || "Custom Drink" : entry.drink || "",
        totalVolumeMl: volumeMl,
        pureAlcoholMl,
        percentageOfTarget: 0,
        timeAllocatedMinutes: 0,
        intervalMinutes: 0,
        quantity: timelineQuantity,
        unit: entry.unit,
      },
    });
  }

  const drinkCalculations: DrinkCalculation[] = slots
    .filter((slot): slot is { kind: "alcohol"; calc: DrinkCalculation } => slot.kind === "alcohol")
    .map((slot) => slot.calc);

  const totalPureAlcoholFromDrinks = drinkCalculations.reduce(
    (sum, calc) => sum + calc.pureAlcoholMl,
    0
  );
  const progressRatio =
    targetEthanolMl > 0 ? totalPureAlcoholFromDrinks / targetEthanolMl : 0;
  const adjustedTarget =
    progressRatio > 1 ? totalPureAlcoholFromDrinks : targetEthanolMl;
  const isTargetAdjusted = progressRatio > 1;

  for (const calc of drinkCalculations) {
    calc.percentageOfTarget =
      adjustedTarget > 0 ? (calc.pureAlcoholMl / adjustedTarget) * 100 : 0;
    calc.timeAllocatedMinutes = (calc.percentageOfTarget / 100) * alcoholTimeBudgetMinutes;
    calc.intervalMinutes =
      calc.quantity > 0 ? calc.timeAllocatedMinutes / calc.quantity : 0;
  }

  const totalUnitCount = slots.reduce(
    (sum, slot) => (slot.kind === "alcohol" ? sum + slot.calc.quantity : sum),
    0
  );

  const drinkTimeline: TimelineEntry[] = [];
  let currentTime = new Date(drinkingStartTime);
  let unitIndex = 0;

  for (const slot of slots) {
    if (slot.kind === "break") {
      drinkTimeline.push({
        kind: "break",
        entryId: slot.entry.entryId,
        drinkId: "",
        drinkName: slot.entry.drinkName,
        unitNumber: 0,
        totalUnits: 0,
        time: new Date(currentTime),
        pureAlcoholMl: 0,
        percentageOfTarget: 0,
        icon: "",
        unit: "",
        durationMinutes: slot.entry.durationMinutes,
        ...(typeof slot.entry.volumeMl === "number" &&
        Number.isFinite(slot.entry.volumeMl) &&
        slot.entry.volumeMl >= 0
          ? { volumeMl: slot.entry.volumeMl }
          : {}),
      });
      currentTime = calculateTimeWithMidnight(currentTime, slot.entry.durationMinutes);
      continue;
    }

    const calc = slot.calc;
    const drinkData = allDrinks.find((d) => d.name === calc.drinkName);
    const category = drinkData?.category || "";
    const icon = getDrinkIcon(category);

    for (let i = 1; i <= calc.quantity; i++) {
      let displayName: string;
      if ((calc.unit === "ml" || calc.unit === "oz") && calc.quantity > 1) {
        const portionSize = Math.round(calc.totalVolumeMl / calc.quantity);
        displayName = `${portionSize}${calc.unit} ${calc.drinkName}`;
      } else if (calc.unit === "ml" || calc.unit === "oz") {
        displayName = `${calc.totalVolumeMl.toFixed(0)}${calc.unit} ${calc.drinkName}`;
      } else {
        displayName = calc.drinkName;
      }

      drinkTimeline.push({
        kind: "alcohol",
        entryId: timelineEntryId(calc.drinkId, i),
        drinkId: calc.drinkId,
        drinkName: displayName,
        unitNumber: i,
        totalUnits: calc.quantity,
        time: new Date(currentTime),
        pureAlcoholMl: calc.pureAlcoholMl / calc.quantity,
        percentageOfTarget: calc.percentageOfTarget / calc.quantity,
        icon,
        unit: calc.unit,
        intervalMinutes: calc.intervalMinutes,
      });

      unitIndex++;
      if (unitIndex < totalUnitCount) {
        currentTime = calculateTimeWithMidnight(currentTime, calc.intervalMinutes);
      }
    }
  }

  return {
    drinkCalculations,
    drinkTimeline,
    adjustedTargetMl: isTargetAdjusted ? adjustedTarget : null,
    isTargetAdjusted,
  };
}

export type ConsumedSnapshot = {
  entryId: string;
  sourceDrinkId: string;
  consumedAt: Date;
  pureAlcoholMl: number;
};

/**
 * Mark one timeline entry as consumed. Idempotent: repeating the same
 * entry id returns the unchanged snapshot array. Breaks and unknown entry
 * ids are ignored.
 */
export function markEntryConsumed(
  timeline: TimelineEntry[],
  consumed: ConsumedSnapshot[],
  entryId: string,
  consumedAt: Date
): ConsumedSnapshot[] {
  if (consumed.some((snapshot) => snapshot.entryId === entryId)) return consumed;
  const entry = timeline.find((candidate) => candidate.entryId === entryId);
  if (!entry || entry.kind !== "alcohol") return consumed;
  return [
    ...consumed,
    { entryId, sourceDrinkId: entry.drinkId, consumedAt, pureAlcoholMl: entry.pureAlcoholMl },
  ];
}

/**
 * Accumulate positive delay minutes for an entry. Non-finite or non-positive
 * values are rejected: the record is returned unchanged.
 */
export function accumulateDelay(
  delayedMinutes: Record<string, number>,
  entryId: string,
  minutes: number
): Record<string, number> {
  if (!Number.isFinite(minutes) || minutes <= 0) return delayedMinutes;
  return { ...delayedMinutes, [entryId]: (delayedMinutes[entryId] ?? 0) + minutes };
}

/**
 * Prune locks, consumed snapshots, and delay state whose source drink is no
 * longer present in the supplied drink set.
 */
export function pruneStaleActionState(
  drinks: { id: string }[],
  state: { consumed: ConsumedSnapshot[]; delayed: Record<string, number>; locked: string[] }
): { consumed: ConsumedSnapshot[]; delayed: Record<string, number>; locked: string[] } {
  const ids = new Set(drinks.map((drink) => drink.id));
  const consumed = state.consumed.filter((snapshot) => ids.has(snapshot.sourceDrinkId));
  const delayed: Record<string, number> = {};
  for (const [key, value] of Object.entries(state.delayed)) {
    const sourceId = sourceDrinkIdFromEntryId(key);
    if (sourceId && ids.has(sourceId)) delayed[key] = value;
  }
  const locked = state.locked.filter((id) => ids.has(id));
  return { consumed, delayed, locked };
}

/**
 * Deterministic rescheduling of the existing drink set. Consumed entries
 * never move; every unconsumed entry is remaining work and can reflow. Drink
 * locks are intentionally absent here because they protect catalogue choices
 * during regeneration, not scheduled times.
 */
export function rescheduleTimeline(input: {
  timeline: TimelineEntry[];
  consumed: ConsumedSnapshot[];
  delayedMinutes: Record<string, number>;
  now: Date;
  targetEndTime: Date | null;
}): { timeline: TimelineEntry[]; effectivePlanEndTime: Date | null } {
  const { timeline, consumed, delayedMinutes, now, targetEndTime } = input;
  const consumedIds = new Set(consumed.map((snapshot) => snapshot.entryId));
  const nowMs = now.getTime();

  const delayMsOf = (entryId: string): number => {
    const minutes = delayedMinutes[entryId];
    return typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0
      ? minutes * 60000
      : 0;
  };
  const durationMsOf = (entry: TimelineEntry): number =>
    entry.kind === "break" ? entry.durationMinutes * 60000 : entry.intervalMinutes * 60000;

  // Consumed entries are immovable. Every other entry remains flexible,
  // regardless of whether its source drink is locked against regeneration.
  const fixedTimeMs: (number | null)[] = timeline.map((entry) => {
    if (consumedIds.has(entry.entryId)) return entry.time.getTime();
    return null;
  });

  const rescheduled: TimelineEntry[] = [];
  let floor = nowMs;
  let index = 0;

  while (index < timeline.length) {
    const fixedAt = fixedTimeMs[index];

    if (fixedAt !== null) {
      const entry = timeline[index];
      // An anchor yields only to something already immovably later; it is
      // never pulled backwards.
      const placed = Math.max(fixedAt, floor);
      rescheduled.push({ ...entry, time: new Date(placed) });
      floor = consumedIds.has(entry.entryId)
        ? Math.max(floor, placed)
        : placed + durationMsOf(entry);
      index += 1;
      continue;
    }

    // Gather the run of flexible entries up to the next immovable one, then
    // lay them out between the current floor and that anchor.
    let end = index;
    while (end < timeline.length && fixedTimeMs[end] === null) end += 1;
    const nextFixedMs = end < timeline.length ? (fixedTimeMs[end] as number) : null;

    const naturalTimes: number[] = [];
    let cursor = floor;
    for (let k = index; k < end; k += 1) {
      const placed = Math.max(timeline[k].time.getTime() + delayMsOf(timeline[k].entryId), cursor);
      naturalTimes.push(placed);
      cursor = placed + durationMsOf(timeline[k]);
    }

    if (nextFixedMs === null || cursor <= nextFixedMs) {
      for (let k = index; k < end; k += 1) {
        rescheduled.push({ ...timeline[k], time: new Date(naturalTimes[k - index]) });
      }
      floor = cursor;
    } else {
      // The run overruns the anchor. Compress it evenly into the remaining
      // window rather than displacing the anchor.
      const count = end - index;
      const step = Math.max(0, nextFixedMs - floor) / count;
      for (let k = index; k < end; k += 1) {
        rescheduled.push({ ...timeline[k], time: new Date(floor + step * (k - index)) });
      }
      floor = nextFixedMs;
    }

    index = end;
  }

  let effectivePlanEndTime: Date | null = targetEndTime;
  const lastEntry = rescheduled[rescheduled.length - 1];
  if (lastEntry) {
    const durationMs =
      lastEntry.kind === "break"
        ? lastEntry.durationMinutes * 60000
        : lastEntry.intervalMinutes * 60000;
    const lastEndMs = lastEntry.time.getTime() + durationMs;
    if (!effectivePlanEndTime || effectivePlanEndTime.getTime() < lastEndMs) {
      effectivePlanEndTime = new Date(lastEndMs);
    }
  }

  return { timeline: rescheduled, effectivePlanEndTime };
}

/**
 * Keep source drinks protected by consumed snapshots or kept ids, remove
 * every replaceable source drink, and append the supplied generated drinks
 * once. Repeated generated ids keep their first occurrence; reapplying the
 * same input is idempotent.
 */
export function applyRegenerationToDrinks<T extends { id: string }>(
  drinks: T[],
  protectedSourceIds: Iterable<string>,
  generatedDrinks: T[]
): T[] {
  const protectedIds = new Set(protectedSourceIds);
  const kept: T[] = [];
  for (const drink of drinks) {
    if (protectedIds.has(drink.id)) kept.push(drink);
  }
  const seen = new Set(kept.map((drink) => drink.id));
  const added: T[] = [];
  for (const generated of generatedDrinks) {
    if (seen.has(generated.id)) continue;
    seen.add(generated.id);
    added.push(generated);
  }
  return [...kept, ...added];
}

export type RegenerationContextInput = {
  targetEthanolMl: number;
  timeline: TimelineEntry[];
  consumedSnapshots: ConsumedSnapshot[];
  keptSourceIds: string[];
  now: Date;
};

export type ProtectedRemainingEntry = {
  entryId: string;
  sourceDrinkId: string;
  pureAlcoholMl: number;
};

export type RegenerationContext = {
  targetEthanolMl: number;
  consumedEthanolMl: number;
  keptRemainingEthanolMl: number;
  replaceableRemainingEthanolMl: number;
  plannedEthanolMl: number;
  remainingEthanolMl: number;
  overTargetEthanolMl: number;
  consumedFraction: number;
  keptRemainingFraction: number;
  replaceableRemainingFraction: number;
  plannedFraction: number;
  protectedRemainingEntries: ProtectedRemainingEntry[];
};

/**
 * Pure regeneration accounting. "Remaining" means unconsumed regardless of
 * whether the old scheduled timestamp has passed. Consumed ethanol and kept
 * remaining ethanol are disjoint; neither is subtracted twice. These fields,
 * not model totals, are the authoritative inputs for a later layered
 * vessel/progress visual.
 */
export function deriveRegenerationContext(
  input: RegenerationContextInput
): RegenerationContext {
  const { targetEthanolMl, timeline, consumedSnapshots, keptSourceIds, now } = input;
  const consumedIds = new Set(consumedSnapshots.map((snapshot) => snapshot.entryId));
  const protectedSources = new Set([
    ...keptSourceIds,
    ...consumedSnapshots.map((snapshot) => snapshot.sourceDrinkId),
  ]);

  const alcoholEntries = timeline.filter(
    (entry): entry is AlcoholTimelineEntry => entry.kind === "alcohol"
  );

  const consumedEthanolMl = consumedSnapshots.reduce(
    (sum, snapshot) => (Number.isFinite(snapshot.pureAlcoholMl) ? sum + snapshot.pureAlcoholMl : sum),
    0
  );
  const keptRemainingEthanolMl = alcoholEntries
    .filter(
      (entry) => !consumedIds.has(entry.entryId) && protectedSources.has(entry.drinkId)
    )
    .reduce((sum, entry) => sum + entry.pureAlcoholMl, 0);
  const replaceableRemainingEthanolMl = alcoholEntries
    .filter(
      (entry) => !consumedIds.has(entry.entryId) && !protectedSources.has(entry.drinkId)
    )
    .reduce((sum, entry) => sum + entry.pureAlcoholMl, 0);
  const plannedEthanolMl = alcoholEntries.reduce((sum, entry) => sum + entry.pureAlcoholMl, 0);
  const remainingEthanolMl = Math.max(
    0,
    targetEthanolMl - consumedEthanolMl - keptRemainingEthanolMl
  );
  const overTargetEthanolMl = Math.max(0, plannedEthanolMl - targetEthanolMl);

  const targetValid = Number.isFinite(targetEthanolMl) && targetEthanolMl > 0;
  const fractionOf = (ethanolMl: number): number =>
    targetValid ? ethanolMl / targetEthanolMl : 0;

  const protectedRemainingEntries: ProtectedRemainingEntry[] = alcoholEntries
    .filter((entry) => !consumedIds.has(entry.entryId) && protectedSources.has(entry.drinkId))
    .map((entry) => ({
      entryId: entry.entryId,
      sourceDrinkId: entry.drinkId,
      pureAlcoholMl: entry.pureAlcoholMl,
    }));

  return {
    targetEthanolMl,
    consumedEthanolMl,
    keptRemainingEthanolMl,
    replaceableRemainingEthanolMl,
    plannedEthanolMl,
    remainingEthanolMl,
    overTargetEthanolMl,
    consumedFraction: fractionOf(consumedEthanolMl),
    keptRemainingFraction: fractionOf(keptRemainingEthanolMl),
    replaceableRemainingFraction: fractionOf(replaceableRemainingEthanolMl),
    plannedFraction: fractionOf(plannedEthanolMl),
    protectedRemainingEntries,
  };
}

export type SessionPhase = "planning" | "active" | "winding-down";

/**
 * Planning without a usable timeline/start; active while unconsumed alcoholic
 * entries remain and the effective plan end is in the future; winding-down
 * once every alcoholic entry is consumed or the effective plan end has
 * passed. Breaks do not block wind-down.
 */
export function deriveSessionPhase(
  timeline: TimelineEntry[],
  consumedSnapshots: ConsumedSnapshot[],
  effectivePlanEndTime: Date | null,
  now: Date
): SessionPhase {
  const alcoholEntries = timeline.filter((entry) => entry.kind === "alcohol");
  if (alcoholEntries.length === 0) return "planning";
  const consumedIds = new Set(consumedSnapshots.map((snapshot) => snapshot.entryId));
  const unconsumed = alcoholEntries.filter((entry) => !consumedIds.has(entry.entryId));
  if (
    unconsumed.length > 0 &&
    effectivePlanEndTime &&
    effectivePlanEndTime.getTime() > now.getTime()
  ) {
    return "active";
  }
  return "winding-down";
}

export type WindDownSummary = {
  lastDrinkAt: Date | null;
  soberAt: Date | null;
  under008At: Date | null;
  peakBAC: number | null;
  consumedEthanolMl: number;
  plannedEthanolMl: number;
};

export type WindDownSummaryInput = {
  userMetrics: EngineUserMetrics;
  consumedSnapshots: ConsumedSnapshot[];
  timeline: TimelineEntry[];
};

const ELIMINATION_PER_HOUR = 0.015;
const ALCOHOL_DENSITY = 0.789;

/**
 * BAC at each logged consumption from cumulative consumed ethanol, minus
 * exactly 0.015 BAC percentage points per hour elapsed since the first
 * logged drink. Future 0.08 and 0.00 crossings derive from BAC at the last
 * logged drink. Invalid body-water inputs return null BAC/time estimates but
 * still return ethanol totals.
 */
export function deriveWindDownSummary(input: WindDownSummaryInput): WindDownSummary {
  const { userMetrics, consumedSnapshots, timeline } = input;

  const plannedEthanolMl = timeline
    .filter((entry): entry is AlcoholTimelineEntry => entry.kind === "alcohol")
    .reduce((sum, entry) => sum + entry.pureAlcoholMl, 0);
  const consumedEthanolMl = consumedSnapshots.reduce(
    (sum, snapshot) => (Number.isFinite(snapshot.pureAlcoholMl) ? sum + snapshot.pureAlcoholMl : sum),
    0
  );

  const weightKg = getWeightInKg(userMetrics.weight, userMetrics.weightUnit);
  const heightCm = getHeightInCm(
    userMetrics.heightCm,
    userMetrics.heightFt,
    userMetrics.heightIn,
    userMetrics.heightUnit
  );
  const tbwGrams = weightKg
    ? getTBWGrams({
        metricType: userMetrics.metricType,
        bodyFat: userMetrics.bodyFat,
        age: userMetrics.age,
        heightCm,
        weightKg,
        sex: userMetrics.sex,
      })
    : null;

  if (!tbwGrams || consumedSnapshots.length === 0) {
    return {
      lastDrinkAt: null,
      soberAt: null,
      under008At: null,
      peakBAC: tbwGrams ? 0 : null,
      consumedEthanolMl,
      plannedEthanolMl,
    };
  }

  const ordered = [...consumedSnapshots].sort(
    (a, b) => a.consumedAt.getTime() - b.consumedAt.getTime()
  );
  const firstTimeMs = ordered[0].consumedAt.getTime();
  let cumulativeEthanolMl = 0;
  let peakBAC = 0;
  for (const snapshot of ordered) {
    cumulativeEthanolMl += Number.isFinite(snapshot.pureAlcoholMl)
      ? snapshot.pureAlcoholMl
      : 0;
    const hoursSinceFirst = (snapshot.consumedAt.getTime() - firstTimeMs) / 3600000;
    const bac =
      ((cumulativeEthanolMl * ALCOHOL_DENSITY) / tbwGrams) * 100 -
      ELIMINATION_PER_HOUR * hoursSinceFirst;
    peakBAC = Math.max(peakBAC, bac);
  }

  const lastDrinkAt = ordered[ordered.length - 1].consumedAt;
  const hoursSinceFirst = (lastDrinkAt.getTime() - firstTimeMs) / 3600000;
  const bacAtLastDrink =
    ((cumulativeEthanolMl * ALCOHOL_DENSITY) / tbwGrams) * 100 -
    ELIMINATION_PER_HOUR * hoursSinceFirst;

  const crossingFromLast = (threshold: number): Date => {
    if (bacAtLastDrink <= threshold) return lastDrinkAt;
    const hours = (bacAtLastDrink - threshold) / ELIMINATION_PER_HOUR;
    return new Date(lastDrinkAt.getTime() + hours * 3600000);
  };

  return {
    lastDrinkAt,
    soberAt: crossingFromLast(0),
    under008At: crossingFromLast(0.08),
    peakBAC,
    consumedEthanolMl,
    plannedEthanolMl,
  };
}
