import { describe, expect, it } from "vitest";
import type { EngineUserMetrics } from "@/lib/sessionEngine";
import {
  accumulateDelay,
  applyRegenerationToDrinks,
  calculateSessionTimeline,
  deriveRegenerationContext,
  deriveSessionPhase,
  deriveWindDownSummary,
  markEntryConsumed,
  pruneStaleActionState,
  rescheduleTimeline,
  sourceDrinkIdFromEntryId,
  timelineEntryId,
  type ConsumedSnapshot,
  type TimelineEntry,
  type TimelineEntryInput,
} from "@/lib/sessionEngine";

const METRICS: EngineUserMetrics = {
  metricType: "ffmi",
  heightUnit: "cm",
  weightUnit: "kg",
  heightCm: "180",
  heightFt: "",
  heightIn: "",
  weight: "80",
  bodyFat: "20",
  age: "30",
  sex: "male",
};

const TARGET_BAC = { min: 0.06, max: 0.09 };
const START = new Date(0);

function customDrink(id: string, name: string, abv: string, quantity: string, unit: "pints" | "glass"): TimelineEntryInput {
  return {
    id,
    category: "custom",
    drink: name,
    customABV: abv,
    quantity,
    unit,
    isCustom: true,
    customName: name,
  };
}

function expectMsClose(actual: number, expected: number, toleranceMs = 1e-3): void {
  expect(Math.abs(actual - expected)).toBeLessThan(toleranceMs);
}

function asBreak(entry: TimelineEntry | undefined): Extract<TimelineEntry, { kind: "break" }> {
  if (!entry || entry.kind !== "break") throw new Error("expected break entry");
  return entry;
}

function asAlcohol(entry: TimelineEntry | undefined): Extract<TimelineEntry, { kind: "alcohol" }> {
  if (!entry || entry.kind !== "alcohol") throw new Error("expected alcohol entry");
  return entry;
}

const BEER = customDrink("beer-1", "Custom Beer", "5", "2", "pints");
const WINE = customDrink("wine-1", "Custom Wine", "12", "1", "glass");

function alcoholTimelineFixture(): TimelineEntry[] {
  return calculateSessionTimeline({
    entries: [BEER, WINE],
    userMetrics: METRICS,
    targetBAC: TARGET_BAC,
    timeDeltaHours: 2,
    drinkingStartTime: START,
  }).drinkTimeline;
}

describe("calculateSessionTimeline — literal alcohol-only characterization", () => {
  it("produces the characterized fixture with literal expected values", () => {
    const result = calculateSessionTimeline({
      entries: [BEER, WINE],
      userMetrics: METRICS,
      targetBAC: TARGET_BAC,
      timeDeltaHours: 2,
      drinkingStartTime: START,
    });

    expect(result.isTargetAdjusted).toBe(true);
    expect(Math.abs((result.adjustedTargetMl as number) - 77.8)).toBeLessThan(1e-9);

    expect(result.drinkCalculations).toHaveLength(2);
    const beerCalc = result.drinkCalculations[0];
    expect(beerCalc.drinkId).toBe("beer-1");
    expect(beerCalc.drinkName).toBe("Custom Beer");
    expect(Math.abs(beerCalc.totalVolumeMl - 1136)).toBeLessThan(1e-9);
    expect(Math.abs(beerCalc.pureAlcoholMl - 56.8)).toBeLessThan(1e-9);
    expect(Math.abs(beerCalc.percentageOfTarget - 73.0077120822622)).toBeLessThan(1e-9);
    expect(Math.abs(beerCalc.timeAllocatedMinutes - 87.60925449871466)).toBeLessThan(1e-9);
    expect(Math.abs(beerCalc.intervalMinutes - 43.80462724935733)).toBeLessThan(1e-9);
    expect(beerCalc.quantity).toBe(2);
    expect(beerCalc.unit).toBe("pints");

    const wineCalc = result.drinkCalculations[1];
    expect(wineCalc.drinkId).toBe("wine-1");
    expect(Math.abs(wineCalc.totalVolumeMl - 175)).toBeLessThan(1e-9);
    expect(Math.abs(wineCalc.pureAlcoholMl - 21)).toBeLessThan(1e-9);
    expect(Math.abs(wineCalc.percentageOfTarget - 26.9922879177378)).toBeLessThan(1e-9);
    expect(Math.abs(wineCalc.timeAllocatedMinutes - 32.3907455012853)).toBeLessThan(1e-9);
    expect(Math.abs(wineCalc.intervalMinutes - 32.3907455012853)).toBeLessThan(1e-9);
    expect(wineCalc.quantity).toBe(1);
    expect(wineCalc.unit).toBe("glass");

    expect(result.drinkTimeline).toHaveLength(3);

    const first = asAlcohol(result.drinkTimeline[0]);
    expect(first.kind).toBe("alcohol");
    expect(first.entryId).toBe("beer-1:unit:1");
    expect(first.drinkId).toBe("beer-1");
    expect(first.drinkName).toBe("Custom Beer");
    expect(first.unitNumber).toBe(1);
    expect(first.totalUnits).toBe(2);
    expect(first.time.getTime()).toBe(0);
    expect(Math.abs(first.pureAlcoholMl - 28.4)).toBeLessThan(1e-9);
    expect(Math.abs(first.percentageOfTarget - 36.5038560411311)).toBeLessThan(1e-9);
    expect(first.icon).toBe("🍹");
    expect(first.unit).toBe("pints");
    expect(Math.abs(first.intervalMinutes - 43.80462724935733)).toBeLessThan(1e-9);

    const second = asAlcohol(result.drinkTimeline[1]);
    expect(second.kind).toBe("alcohol");
    expect(second.entryId).toBe("beer-1:unit:2");
    expect(second.unitNumber).toBe(2);
    expect(second.time.getTime()).toBe(2628277);
    expect(Math.abs(second.pureAlcoholMl - 28.4)).toBeLessThan(1e-9);
    expect(Math.abs(second.percentageOfTarget - 36.5038560411311)).toBeLessThan(1e-9);

    const third = asAlcohol(result.drinkTimeline[2]);
    expect(third.kind).toBe("alcohol");
    expect(third.entryId).toBe("wine-1:unit:1");
    expect(third.drinkName).toBe("Custom Wine");
    expect(third.unitNumber).toBe(1);
    expect(third.totalUnits).toBe(1);
    expect(third.time.getTime()).toBe(5256554);
    expect(Math.abs(third.pureAlcoholMl - 21)).toBeLessThan(1e-9);
    expect(Math.abs(third.percentageOfTarget - 26.9922879177378)).toBeLessThan(1e-9);
    expect(Math.abs(third.intervalMinutes - 32.3907455012853)).toBeLessThan(1e-9);
  });

  it("derives the target ethanol from TBW, BAC midpoint and density", () => {
    const result = calculateSessionTimeline({
      entries: [BEER, WINE],
      userMetrics: METRICS,
      targetBAC: TARGET_BAC,
      timeDeltaHours: 2,
      drinkingStartTime: START,
    });
    const tbwGrams = 48320;
    const grams = (0.075 / 100 + 0.00015 * 2) * tbwGrams;
    expect(Math.abs((grams / 0.789 - 64.3041825095057) / 64.3041825095057)).toBeLessThan(1e-12);
    expect(result.isTargetAdjusted).toBe(true);
    expect(result.adjustedTargetMl).toBeCloseTo(77.8, 9);
  });
});

describe("breaks", () => {
  it("represents a single break in input order, reserving its minutes", () => {
    const breakEntry: TimelineEntryInput = {
      kind: "break",
      entryId: "break-1",
      durationMinutes: 20,
      volumeMl: 330,
      drinkName: "Water",
    };
    const result = calculateSessionTimeline({
      entries: [BEER, breakEntry, WINE],
      userMetrics: METRICS,
      targetBAC: TARGET_BAC,
      timeDeltaHours: 2,
      drinkingStartTime: START,
    });

    expect(result.drinkTimeline).toHaveLength(4);
    const first = result.drinkTimeline[0];
    const second = result.drinkTimeline[1];
    const third = result.drinkTimeline[3];

    expectMsClose(first.time.getTime(), 0);
    const interval = 36.5038560411311;
    expect(second.time.getTime()).toBe(2190231);
    const breakEntryOut = asBreak(result.drinkTimeline[2]);
    expect(breakEntryOut.entryId).toBe("break-1");
    expect(breakEntryOut.drinkName).toBe("Water");
    expect(breakEntryOut.durationMinutes).toBe(20);
    expect(breakEntryOut.volumeMl).toBe(330);
    expect(breakEntryOut.pureAlcoholMl).toBe(0);
    expect(breakEntryOut.percentageOfTarget).toBe(0);
    expect(breakEntryOut.time.getTime()).toBe(4380462);
    expect(third.time.getTime()).toBe(5580462);

    expect(result.drinkCalculations).toHaveLength(2);
    expect(result.isTargetAdjusted).toBe(true);
    expect(result.adjustedTargetMl).toBeCloseTo(77.8, 9);

    const alcoholTimes = result.drinkTimeline.filter((entry) => entry.kind === "alcohol");
    expect(alcoholTimes[1].time.getTime()).toBe(2190231);
  });

  it("represents multiple consecutive breaks and reserves all their minutes", () => {
    const firstBreak: TimelineEntryInput = {
      kind: "break",
      entryId: "break-1",
      durationMinutes: 10,
      drinkName: "Water",
    };
    const secondBreak: TimelineEntryInput = {
      kind: "break",
      entryId: "break-2",
      durationMinutes: 15,
      drinkName: "Break",
    };
    const result = calculateSessionTimeline({
      entries: [BEER, firstBreak, secondBreak, WINE],
      userMetrics: METRICS,
      targetBAC: TARGET_BAC,
      timeDeltaHours: 2,
      drinkingStartTime: START,
    });

    const interval = (36.5038560411311 / 100) * 95;
    const firstBreakOut = asBreak(result.drinkTimeline[2]);
    const secondBreakOut = asBreak(result.drinkTimeline[3]);
    const third = result.drinkTimeline[4];

    expect(firstBreakOut.time.getTime()).toBe(4161438);
    expect(secondBreakOut.time.getTime()).toBe(4761438);
    expect(third.time.getTime()).toBe(5661438);

    const alcoholTimes = result.drinkTimeline.filter((entry) => entry.kind === "alcohol");
    expect(alcoholTimes[1].time.getTime()).toBe(2080719);
    expect(alcoholTimes[2].time.getTime()).toBe(5661438);
  });

  it("ignores breaks whose duration is non-finite or not positive", () => {
    const invalidBreaks: TimelineEntryInput[] = [
      { kind: "break", entryId: "nan", durationMinutes: NaN, drinkName: "NaN" },
      { kind: "break", entryId: "zero", durationMinutes: 0, drinkName: "Zero" },
      { kind: "break", entryId: "neg", durationMinutes: -5, drinkName: "Negative" },
      { kind: "break", entryId: "inf", durationMinutes: Infinity, drinkName: "Inf" },
    ];
    const result = calculateSessionTimeline({
      entries: [BEER, ...invalidBreaks, WINE],
      userMetrics: METRICS,
      targetBAC: TARGET_BAC,
      timeDeltaHours: 2,
      drinkingStartTime: START,
    });

    const expected = calculateSessionTimeline({
      entries: [BEER, WINE],
      userMetrics: METRICS,
      targetBAC: TARGET_BAC,
      timeDeltaHours: 2,
      drinkingStartTime: START,
    });
    expect(result.drinkTimeline).toHaveLength(3);
    expect(result.drinkTimeline.every((entry) => entry.kind === "alcohol")).toBe(true);
    expect(result.drinkTimeline.map((entry) => entry.time.getTime())).toEqual(
      expected.drinkTimeline.map((entry) => entry.time.getTime())
    );
  });
});

describe("markEntryConsumed", () => {
  const timeline = alcoholTimelineFixture();

  it("snapshots entry id, source drink id, consumed time and ethanol; idempotent", () => {
    const consumedAt = new Date(1000);
    const once = markEntryConsumed(timeline, [], "beer-1:unit:1", consumedAt);
    expect(once).toHaveLength(1);
    expect(once[0].entryId).toBe("beer-1:unit:1");
    expect(once[0].sourceDrinkId).toBe("beer-1");
    expect(once[0].consumedAt).toBe(consumedAt);
    expect(Math.abs(once[0].pureAlcoholMl - 28.4)).toBeLessThan(1e-9);
    const twice = markEntryConsumed(timeline, once, "beer-1:unit:1", new Date(9999));
    expect(twice).toBe(once);
    expect(twice).toHaveLength(1);
  });

  it("ignores unknown entry ids and break entries", () => {
    expect(markEntryConsumed(timeline, [], "missing", new Date())).toEqual([]);
    const withBreak = calculateSessionTimeline({
      entries: [BEER, { kind: "break", entryId: "break-1", durationMinutes: 10, drinkName: "Water" }, WINE],
      userMetrics: METRICS,
      targetBAC: TARGET_BAC,
      timeDeltaHours: 2,
      drinkingStartTime: START,
    }).drinkTimeline;
    expect(markEntryConsumed(withBreak, [], "break-1", new Date())).toEqual([]);
  });
});

describe("accumulateDelay", () => {
  it("accumulates positive minutes and rejects invalid values", () => {
    const delayed = accumulateDelay({}, "beer-1:unit:1", 15);
    expect(delayed).toEqual({ "beer-1:unit:1": 15 });
    const accumulated = accumulateDelay(delayed, "beer-1:unit:1", 15);
    expect(accumulated).toEqual({ "beer-1:unit:1": 30 });
    for (const invalid of [NaN, Infinity, -Infinity, 0, -10]) {
      expect(accumulateDelay(accumulated, "beer-1:unit:1", invalid)).toBe(accumulated);
    }
  });
});

describe("pruneStaleActionState", () => {
  it("drops locks, consumed snapshots and delays for removed sources", () => {
    const consumed: ConsumedSnapshot[] = [
      { entryId: "beer-1:unit:1", sourceDrinkId: "beer-1", consumedAt: new Date(1), pureAlcoholMl: 28.4 },
      { entryId: "wine-1:unit:1", sourceDrinkId: "wine-1", consumedAt: new Date(2), pureAlcoholMl: 21 },
    ];
    const delayed = { "beer-1:unit:1": 15, "wine-1:unit:1": 30, unknown: 45 };
    const locked = ["beer-1", "wine-1", "gone"];
    const pruned = pruneStaleActionState([{ id: "wine-1" }], { consumed, delayed, locked });
    expect(pruned.consumed).toEqual([consumed[1]]);
    expect(pruned.delayed).toEqual({ "wine-1:unit:1": 30 });
    expect(pruned.locked).toEqual(["wine-1"]);
  });
});

describe("rescheduleTimeline", () => {
  const targetEnd = new Date(7200000);

  it("reflows elapsed-but-unconsumed entries to no earlier than now", () => {
    const now = new Date(3000000);
    const result = rescheduleTimeline({
      timeline: alcoholTimelineFixture(),
      consumed: [],
      delayedMinutes: {},
      now,
      targetEndTime: targetEnd,
    });

    const entries = result.timeline;
    expect(entries[0].time.getTime()).toBe(3000000);
    expect(entries[1].time.getTime()).toBeGreaterThanOrEqual(3000000);
    expect(entries[2].time.getTime()).toBeGreaterThan(entries[1].time.getTime());
    const timestamps = entries.map((entry) => entry.time.getTime());
    expect(timestamps.every((t) => t >= now.getTime() && Number.isFinite(t))).toBe(true);
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
  });

  it("leaves an elapsed-but-unconsumed entry with zero consumed ethanol and unconsumed status", () => {
    const now = new Date(3000000);
    const timeline = alcoholTimelineFixture();
    const result = rescheduleTimeline({
      timeline,
      consumed: [],
      delayedMinutes: {},
      now,
      targetEndTime: targetEnd,
    });
    const context = deriveRegenerationContext({
      targetEthanolMl: 64.3041825095057,
      timeline: result.timeline,
      consumedSnapshots: [],
      keptSourceIds: [],
      now,
    });
    expect(context.consumedEthanolMl).toBe(0);
    expect(context.plannedEthanolMl).toBeCloseTo(77.8, 9);
    expect(deriveSessionPhase(result.timeline, [], result.effectivePlanEndTime, now)).toBe("active");
  });

  it("moves a delayed future entry by exactly 15 minutes and extends the effective end", () => {
    const now = new Date(0);
    const delayed = accumulateDelay({}, "wine-1:unit:1", 15);
    const result = rescheduleTimeline({
      timeline: alcoholTimelineFixture(),
      consumed: [],
      delayedMinutes: delayed,
      now,
      targetEndTime: targetEnd,
    });

    const last = result.timeline[2];
    expect(last.time.getTime()).toBe(6156554);
    const lastInterval = 32.3907455012853 * 60000;
    expect(result.effectivePlanEndTime!.getTime()).toBe(8099998);
  });

  it("never moves consumed entries and ignores delays on them", () => {
    const consumed = markEntryConsumed(alcoholTimelineFixture(), [], "beer-1:unit:1", new Date(0));
    const result = rescheduleTimeline({
      timeline: alcoholTimelineFixture(),
      consumed,
      delayedMinutes: { "beer-1:unit:1": 30 },
      now: new Date(0),
      targetEndTime: targetEnd,
    });
    expect(result.timeline[0].time.getTime()).toBe(0);
  });

  // Renamed during acceptance: this fixture contains no kept entry and so no
  // anchor. It covers the no-anchor case only; real anchor coverage is in the
  // "absolute anchors" block below.
  it("leaves later unconsumed entries alone when the floor never reaches them", () => {
    const timeline: TimelineEntry[] = [
      {
        kind: "alcohol",
        entryId: "a1",
        drinkId: "A",
        drinkName: "A",
        unitNumber: 1,
        totalUnits: 1,
        time: new Date(0),
        pureAlcoholMl: 10,
        percentageOfTarget: 25,
        icon: "",
        unit: "ml",
        intervalMinutes: 5,
      },
      {
        kind: "alcohol",
        entryId: "b1",
        drinkId: "B",
        drinkName: "B",
        unitNumber: 1,
        totalUnits: 1,
        time: new Date(30 * 60000),
        pureAlcoholMl: 10,
        percentageOfTarget: 25,
        icon: "",
        unit: "ml",
        intervalMinutes: 5,
      },
      {
        kind: "alcohol",
        entryId: "c1",
        drinkId: "C",
        drinkName: "C",
        unitNumber: 1,
        totalUnits: 1,
        time: new Date(35 * 60000),
        pureAlcoholMl: 10,
        percentageOfTarget: 25,
        icon: "",
        unit: "ml",
        intervalMinutes: 5,
      },
    ];
    const now = new Date(10 * 60000);
    const result = rescheduleTimeline({
      timeline,
      consumed: [],
      delayedMinutes: {},
      now,
      targetEndTime: new Date(40 * 60000),
    });
    expect(result.timeline[1].time.getTime()).toBe(30 * 60000);
    expect(result.timeline[2].time.getTime()).toBe(35 * 60000);
  });

  it("extends the effective plan end rather than overwriting the target end", () => {
    const delayed = accumulateDelay({}, "beer-1:unit:2", 15);
    const result = rescheduleTimeline({
      timeline: alcoholTimelineFixture(),
      consumed: [],
      delayedMinutes: delayed,
      now: new Date(0),
      targetEndTime: targetEnd,
    });
    expect(result.effectivePlanEndTime!.getTime()).toBeGreaterThan(targetEnd.getTime());
  });

  it("advances the floor by break duration during rescheduling", () => {
    const timeline = calculateSessionTimeline({
      entries: [
        BEER,
        { kind: "break", entryId: "break-1", durationMinutes: 30, drinkName: "Water" },
      ],
      userMetrics: METRICS,
      targetBAC: TARGET_BAC,
      timeDeltaHours: 2,
      drinkingStartTime: START,
    }).drinkTimeline;
    const now = new Date(3000000);
    const result = rescheduleTimeline({
      timeline,
      consumed: [],
      delayedMinutes: {},
      now,
      targetEndTime: targetEnd,
    });
    const breakOut = asBreak(result.timeline[2]);
    expect(breakOut.time.getTime()).toBeGreaterThanOrEqual(3000000);
    expect(result.effectivePlanEndTime!.getTime()).toBe(breakOut.time.getTime() + 30 * 60000);
  });
});

describe("deriveRegenerationContext and applyRegenerationToDrinks", () => {
  function accountingTimeline(): TimelineEntry[] {
    return [
      {
        kind: "alcohol",
        entryId: "a1",
        drinkId: "A",
        drinkName: "A",
        unitNumber: 1,
        totalUnits: 1,
        time: new Date(0),
        pureAlcoholMl: 10,
        percentageOfTarget: 20,
        icon: "",
        unit: "ml",
        intervalMinutes: 30,
      },
      {
        kind: "alcohol",
        entryId: "b1",
        drinkId: "B",
        drinkName: "B",
        unitNumber: 1,
        totalUnits: 1,
        time: new Date(600000),
        pureAlcoholMl: 5,
        percentageOfTarget: 10,
        icon: "",
        unit: "ml",
        intervalMinutes: 30,
      },
      {
        kind: "alcohol",
        entryId: "c1",
        drinkId: "C",
        drinkName: "C",
        unitNumber: 1,
        totalUnits: 1,
        time: new Date(1200000),
        pureAlcoholMl: 30,
        percentageOfTarget: 60,
        icon: "",
        unit: "ml",
        intervalMinutes: 30,
      },
      {
        kind: "break",
        entryId: "br1",
        drinkId: "",
        drinkName: "Water",
        unitNumber: 0,
        totalUnits: 0,
        time: new Date(1800000),
        pureAlcoholMl: 0,
        percentageOfTarget: 0,
        icon: "",
        unit: "",
        durationMinutes: 20,
      },
    ];
  }

  const consumed: ConsumedSnapshot[] = [
    { entryId: "a1", sourceDrinkId: "A", consumedAt: new Date(0), pureAlcoholMl: 10 },
  ];

  it("derives a 45 ml remaining budget from 60 ml target with 10 ml consumed and 5 ml kept", () => {
    const context = deriveRegenerationContext({
      targetEthanolMl: 60,
      timeline: accountingTimeline(),
      consumedSnapshots: consumed,
      keptSourceIds: ["B"],
      now: new Date(0),
    });

    expect(context.targetEthanolMl).toBe(60);
    expect(context.consumedEthanolMl).toBe(10);
    expect(context.keptRemainingEthanolMl).toBe(5);
    expect(context.replaceableRemainingEthanolMl).toBe(30);
    expect(context.plannedEthanolMl).toBe(45);
    expect(context.remainingEthanolMl).toBe(45);
    expect(context.overTargetEthanolMl).toBe(0);
    expect(context.consumedFraction).toBeCloseTo(10 / 60, 12);
    expect(context.keptRemainingFraction).toBeCloseTo(5 / 60, 12);
    expect(context.replaceableRemainingFraction).toBeCloseTo(30 / 60, 12);
    expect(context.plannedFraction).toBeCloseTo(45 / 60, 12);
    expect(context.protectedRemainingEntries).toEqual([
      { entryId: "b1", sourceDrinkId: "B", pureAlcoholMl: 5 },
    ]);
  });

  it("clamps the remaining budget at zero and zeroes fractions for non-positive targets", () => {
    const overKept = deriveRegenerationContext({
      targetEthanolMl: 10,
      timeline: accountingTimeline(),
      consumedSnapshots: consumed,
      keptSourceIds: ["B"],
      now: new Date(0),
    });
    expect(overKept.remainingEthanolMl).toBe(0);
    expect(overKept.overTargetEthanolMl).toBe(35);

    const invalidTarget = deriveRegenerationContext({
      targetEthanolMl: 0,
      timeline: accountingTimeline(),
      consumedSnapshots: consumed,
      keptSourceIds: ["B"],
      now: new Date(0),
    });
    expect(invalidTarget.remainingEthanolMl).toBe(0);
    expect(invalidTarget.consumedFraction).toBe(0);
    expect(invalidTarget.plannedFraction).toBe(0);
  });

  it("counts breaks as zero ethanol and keeps only consumed sources protected", () => {
    const context = deriveRegenerationContext({
      targetEthanolMl: 60,
      timeline: accountingTimeline(),
      consumedSnapshots: consumed,
      keptSourceIds: [],
      now: new Date(0),
    });
    expect(context.plannedEthanolMl).toBe(45);
    expect(context.replaceableRemainingEthanolMl).toBe(35);
  });

  it("applies a generated set preserving consumed/kept sources and replacing unlocked ones", () => {
    const drinks = applyRegenerationToDrinks(
      [
        { id: "A", name: "A" },
        { id: "B", name: "B" },
        { id: "C", name: "C" },
      ],
      ["A", "B"],
      [
        { id: "g1", name: "Generated One" },
        { id: "g2", name: "Generated Two" },
      ]
    );
    expect(drinks.map((drink) => drink.id)).toEqual(["A", "B", "g1", "g2"]);
  });

  it("deduplicates repeated generated ids keeping the first occurrence and is idempotent", () => {
    const original = [
      { id: "A", name: "A" },
      { id: "C", name: "C" },
    ];
    const generated = [
      { id: "g1", name: "Gen One" },
      { id: "g1", name: "Gen One Duplicate" },
      { id: "g2", name: "Gen Two" },
    ];
    const applied = applyRegenerationToDrinks(original, ["A"], generated);
    expect(applied.map((drink) => drink.id)).toEqual(["A", "g1", "g2"]);
    const reapplied = applyRegenerationToDrinks(applied, ["A"], generated);
    expect(reapplied.map((drink) => drink.id)).toEqual(["A", "g1", "g2"]);
  });

  it("keeps only protected sources when the model returns nothing", () => {
    const applied = applyRegenerationToDrinks(
      [{ id: "A" }, { id: "C" }],
      ["A"],
      []
    );
    expect(applied.map((drink) => drink.id)).toEqual(["A"]);
  });
});

describe("deriveSessionPhase", () => {
  const timeline = alcoholTimelineFixture();
  const consumed = markEntryConsumed(timeline, [], "beer-1:unit:1", new Date(0));

  it("is planning without a usable timeline", () => {
    expect(deriveSessionPhase([], [], new Date(7200000), new Date(0))).toBe("planning");
    const breaksOnly = calculateSessionTimeline({
      entries: [{ kind: "break", entryId: "br1", durationMinutes: 10, drinkName: "Water" }],
      userMetrics: METRICS,
      targetBAC: TARGET_BAC,
      timeDeltaHours: 2,
      drinkingStartTime: START,
    }).drinkTimeline;
    expect(deriveSessionPhase(breaksOnly, [], new Date(7200000), new Date(0))).toBe("planning");
  });

  it("is active while unconsumed alcohol remains and the effective end is in the future", () => {
    expect(deriveSessionPhase(timeline, [], new Date(7200000), new Date(0))).toBe("active");
  });

  it("is winding-down once every alcoholic entry is consumed", () => {
    const allConsumed = markEntryConsumed(
      timeline,
      markEntryConsumed(timeline, consumed, "beer-1:unit:2", new Date(1000)),
      "wine-1:unit:1",
      new Date(2000)
    );
    expect(deriveSessionPhase(timeline, allConsumed, new Date(7200000), new Date(0))).toBe(
      "winding-down"
    );
  });

  it("is winding-down once the effective plan end has passed", () => {
    expect(deriveSessionPhase(timeline, [], new Date(6000), new Date(10000))).toBe("winding-down");
  });
});

describe("deriveWindDownSummary", () => {
  const consumed: ConsumedSnapshot[] = [
    {
      entryId: "beer-1:unit:1",
      sourceDrinkId: "beer-1",
      consumedAt: new Date(Date.parse("2026-01-10T22:00:00Z")),
      pureAlcoholMl: 28.4,
    },
    {
      entryId: "beer-1:unit:2",
      sourceDrinkId: "beer-1",
      consumedAt: new Date(Date.parse("2026-01-10T23:00:00Z")),
      pureAlcoholMl: 28.4,
    },
    {
      entryId: "wine-1:unit:1",
      sourceDrinkId: "wine-1",
      consumedAt: new Date(Date.parse("2026-01-11T00:30:00Z")),
      pureAlcoholMl: 21,
    },
  ];

  it("computes peak BAC and 0.08/0.00 crossings crossing midnight", () => {
    const summary = deriveWindDownSummary({
      userMetrics: METRICS,
      consumedSnapshots: consumed,
      timeline: alcoholTimelineFixture(),
    });

    expect(summary.consumedEthanolMl).toBeCloseTo(77.8, 9);
    expect(summary.plannedEthanolMl).toBeCloseTo(77.8, 9);
    expect(summary.lastDrinkAt!.getTime()).toBe(Date.parse("2026-01-11T00:30:00Z"));
    expect(Math.abs(summary.peakBAC! - 0.08953683774834437)).toBeLessThan(1e-12);
    expectMsClose(summary.under008At!.getTime(), 1768093688841, 0.1);
    expectMsClose(summary.soberAt!.getTime(), 1768112888841, 0.1);
    expect(summary.under008At!.getTime()).toBeGreaterThan(summary.lastDrinkAt!.getTime());
    expect(summary.soberAt!.getTime()).toBeGreaterThan(summary.under008At!.getTime());
  });

  it("returns the last drink time when BAC is already at/below a threshold", () => {
    const tiny: ConsumedSnapshot[] = [
      {
        entryId: "x1",
        sourceDrinkId: "X",
        consumedAt: new Date(Date.parse("2026-01-10T22:00:00Z")),
        pureAlcoholMl: 1,
      },
    ];
    const summary = deriveWindDownSummary({
      userMetrics: METRICS,
      consumedSnapshots: tiny,
      timeline: alcoholTimelineFixture(),
    });
    expect(summary.lastDrinkAt!.getTime()).toBe(Date.parse("2026-01-10T22:00:00Z"));
    expect(summary.under008At!.getTime()).toBe(summary.lastDrinkAt!.getTime());
    expect(summary.soberAt!.getTime()).toBeGreaterThan(summary.lastDrinkAt!.getTime());
  });

  it("returns null BAC/time estimates for invalid body-water inputs but keeps ethanol totals", () => {
    const brokenMetrics: EngineUserMetrics = { ...METRICS, weight: "" };
    const summary = deriveWindDownSummary({
      userMetrics: brokenMetrics,
      consumedSnapshots: consumed,
      timeline: alcoholTimelineFixture(),
    });
    expect(summary.lastDrinkAt).toBeNull();
    expect(summary.soberAt).toBeNull();
    expect(summary.under008At).toBeNull();
    expect(summary.peakBAC).toBeNull();
    expect(summary.consumedEthanolMl).toBeCloseTo(77.8, 9);
    expect(summary.plannedEthanolMl).toBeCloseTo(77.8, 9);
  });

  it("returns zero peak and null dates when nothing was consumed", () => {
    const summary = deriveWindDownSummary({
      userMetrics: METRICS,
      consumedSnapshots: [],
      timeline: alcoholTimelineFixture(),
    });
    expect(summary.lastDrinkAt).toBeNull();
    expect(summary.soberAt).toBeNull();
    expect(summary.under008At).toBeNull();
    expect(summary.peakBAC).toBe(0);
    expect(summary.consumedEthanolMl).toBe(0);
    expect(summary.plannedEthanolMl).toBeCloseTo(77.8, 9);
  });
});

describe("timelineEntryId", () => {
  it("derives deterministic ids from source id and unit number and parses them back", () => {
    expect(timelineEntryId("drink-abc", 2)).toBe("drink-abc:unit:2");
    expect(sourceDrinkIdFromEntryId("drink-abc:unit:2")).toBe("drink-abc");
    expect(sourceDrinkIdFromEntryId("no-separator")).toBeNull();
    expect(sourceDrinkIdFromEntryId(":unit:1")).toBeNull();
  });
});

// Derived from spec Req 3 during acceptance, not from the implementation.
// The submitted suite named a test for this clause but exercised no anchor,
// and the clause was absent: rescheduleTimeline took no kept ids at all.
describe("rescheduleTimeline absolute anchors", () => {
  const MIN = 60000;
  const at = (
    entryId: string,
    sourceId: string,
    minutes: number,
    intervalMinutes: number
  ): TimelineEntry => ({
    kind: "alcohol",
    entryId,
    drinkId: sourceId,
    drinkName: sourceId,
    unitNumber: 1,
    totalUnits: 1,
    time: new Date(minutes * MIN),
    pureAlcoholMl: 10,
    percentageOfTarget: 25,
    icon: "",
    unit: "ml",
    intervalMinutes,
  });

  const run = (
    timeline: TimelineEntry[],
    keptSourceIds: string[],
    nowMinutes: number,
    delayedMinutes: Record<string, number> = {}
  ) =>
    rescheduleTimeline({
      timeline,
      consumed: [],
      delayedMinutes,
      keptSourceIds,
      now: new Date(nowMinutes * MIN),
      targetEndTime: new Date(120 * MIN),
    });

  it("holds a kept, unconsumed entry scheduled strictly after now", () => {
    // A reflows from 0 to now=10 and its 30-minute interval would push the
    // floor to 40, which previously dragged the kept entry B from 30 to 40.
    const result = run([at("a1", "A", 0, 30), at("b1", "B", 30, 5)], ["B"], 10);
    expect(result.timeline[0].time.getTime()).toBe(10 * MIN);
    expect(result.timeline[1].time.getTime()).toBe(30 * MIN);
  });

  it("treats a kept entry scheduled at or before now as remaining work", () => {
    // Kept selection does not exempt it: it is in the past, so it reflows.
    const result = run([at("b1", "B", 5, 5)], ["B"], 10);
    expect(result.timeline[0].time.getTime()).toBe(10 * MIN);
  });

  it("compresses a flexible run into the window before an anchor", () => {
    // Two flexible entries with 30-minute intervals cannot fit before the
    // anchor at 30; they compress rather than displacing it.
    const result = run(
      [at("a1", "A", 0, 30), at("c1", "C", 5, 30), at("b1", "B", 30, 5)],
      ["B"],
      0
    );
    expect(result.timeline[2].time.getTime()).toBe(30 * MIN);
    expect(result.timeline[0].time.getTime()).toBe(0);
    expect(result.timeline[1].time.getTime()).toBe(15 * MIN);
  });

  it("never emits decreasing timestamps around anchors", () => {
    const result = run(
      [at("a1", "A", 0, 45), at("c1", "C", 2, 45), at("b1", "B", 20, 5), at("d1", "D", 25, 5)],
      ["B"],
      0
    );
    const times = result.timeline.map((entry) => entry.time.getTime());
    for (let i = 1; i < times.length; i += 1) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
    }
  });

  it("moves a delayed anchor by exactly its delay and then holds it there", () => {
    const result = run(
      [at("a1", "A", 0, 30), at("b1", "B", 30, 5)],
      ["B"],
      10,
      { b1: 15 }
    );
    expect(result.timeline[1].time.getTime()).toBe(45 * MIN);
  });

  it("treats every unconsumed entry as flexible when no kept ids are supplied", () => {
    const result = run([at("a1", "A", 0, 30), at("b1", "B", 30, 5)], [], 10);
    expect(result.timeline[1].time.getTime()).toBe(40 * MIN);
  });
});
