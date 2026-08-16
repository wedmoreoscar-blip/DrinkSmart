import { describe, expect, it } from "vitest";
import { appSessionStateTransitions } from "@/contexts/AppContext";

const { applyChangedStatsToPlanState, isMaterialStatsChange, plannedDrinksAtRisk } =
  appSessionStateTransitions;

const usableStats = {
  metricType: "bmi" as const,
  heightUnit: "cm" as const,
  weightUnit: "kg" as const,
  heightCm: "180",
  heightFt: "",
  heightIn: "",
  weight: "80",
  bodyFat: "",
  age: "30",
  sex: "male" as const,
};

const blankStats = { ...usableStats, weight: "", age: "", sex: "" as const };

function stateWith(overrides: Record<string, unknown> = {}) {
  return {
    userMetrics: usableStats,
    inebriationLevel: 4,
    targetBAC: { min: 0.08, max: 0.11 },
    drinks: [
      { id: "planned-a", drink: "Lager", quantity: "568", unit: "ml" },
      { id: "planned-b", drink: "Long Island", quantity: "250", unit: "ml" },
    ],
    lockedDrinkIds: ["planned-a"],
    drinkingStartTime: new Date("2026-08-16T19:00:00Z"),
    drinkingTargetTime: new Date("2026-08-16T23:00:00Z"),
    timeDelta: 4,
    drinkTimeline: [{ entryId: "planned-a:unit:1" }],
    drinkCalculations: [{ drinkId: "planned-a" }],
    adjustedTargetMl: 200,
    isTargetAdjusted: true,
    breaks: [],
    consumedTimelineEntries: [],
    delayedEntryMinutes: {},
    effectivePlanEndTime: new Date("2026-08-16T23:15:00Z"),
    budget: { min: 20, max: 60 },
    ...overrides,
  } as unknown as Parameters<typeof applyChangedStatsToPlanState>[0];
}

describe("a material stats change clears the plan", () => {
  it("drops planned drinks when a BAC-relevant stat changes", () => {
    const next = applyChangedStatsToPlanState(stateWith(), { ...usableStats, weight: "65" });
    expect(next.drinks.some((d) => d.drink === "Lager")).toBe(false);
    expect(next.drinks.some((d) => d.drink === "Long Island")).toBe(false);
    expect(next.drinkTimeline).toEqual([]);
    expect(next.isTargetAdjusted).toBe(false);
  });

  it("keeps the night: buzz, window and budget are choices about the evening", () => {
    const previous = stateWith();
    const next = applyChangedStatsToPlanState(previous, { ...usableStats, sex: "female" });
    expect(next.inebriationLevel).toBe(4);
    expect(next.drinkingStartTime).toBe(previous.drinkingStartTime);
    expect(next.drinkingTargetTime).toBe(previous.drinkingTargetTime);
    expect(next.budget).toEqual({ min: 20, max: 60 });
  });

  // The trap this guards: MetricsSync pushes stats in after the profile loads,
  // so treating empty-to-populated as a change would wipe the plan on every
  // single page load.
  it("does not treat the first population as a change", () => {
    const next = applyChangedStatsToPlanState(
      stateWith({ userMetrics: blankStats }),
      usableStats,
    );
    expect(next.drinks.map((d) => d.drink)).toEqual(["Lager", "Long Island"]);
    expect(next.userMetrics).toEqual(usableStats);
  });

  it("ignores a re-push of identical stats", () => {
    const previous = stateWith();
    const next = applyChangedStatsToPlanState(previous, { ...usableStats });
    expect(next.drinks).toBe(previous.drinks);
  });

  it("already-drunk drinks survive — a stats edit does not un-drink them", () => {
    const previous = stateWith({
      consumedTimelineEntries: [
        { entryId: "planned-a:unit:1", sourceDrinkId: "planned-a", pureAlcoholMl: 25 },
      ],
    });
    const next = applyChangedStatsToPlanState(previous, { ...usableStats, weight: "65" });
    expect(next.drinks.some((d) => d.id === "planned-a")).toBe(true);
    expect(next.drinks.some((d) => d.id === "planned-b")).toBe(false);
    expect(next.consumedTimelineEntries).toHaveLength(1);
  });

  // docs/decisions.md: a lock only stops regeneration, and nothing else.
  it("a lock does not protect a drink from a stats change", () => {
    const next = applyChangedStatsToPlanState(stateWith(), { ...usableStats, age: "45" });
    expect(next.drinks.some((d) => d.id === "planned-a")).toBe(false);
    expect(next.lockedDrinkIds).toEqual([]);
  });
});

/**
 * These two gate the confirmation dialog in Profile. Getting either wrong is
 * worse than the bug they guard: a false positive nags the user on every save,
 * and a false negative destroys a plan with no warning at all.
 */
describe("isMaterialStatsChange", () => {
  it("is true for every stat the BAC engine reads", () => {
    type Stats = Parameters<typeof isMaterialStatsChange>[0];
    const changes: Partial<Stats>[] = [
      { weight: "65" },
      { weightUnit: "lbs" },
      { heightCm: "175" },
      { heightFt: "5" },
      { heightIn: "10" },
      { heightUnit: "ft" },
      { age: "45" },
      { sex: "female" },
      { bodyFat: "18" },
      { metricType: "ffmi" },
    ];
    for (const change of changes) {
      expect(isMaterialStatsChange(usableStats, { ...usableStats, ...change })).toBe(true);
    }
  });

  it("is false for identical stats", () => {
    expect(isMaterialStatsChange(usableStats, { ...usableStats })).toBe(false);
  });

  it("is false when the previous stats could not produce a target", () => {
    expect(isMaterialStatsChange(blankStats, usableStats)).toBe(false);
    expect(isMaterialStatsChange({ ...usableStats, sex: "" }, usableStats)).toBe(false);
  });
});

describe("plannedDrinksAtRisk", () => {
  it("counts only real, unconsumed drinks", () => {
    expect(plannedDrinksAtRisk(stateWith())).toBe(2);
  });

  it("excludes what has already been drunk", () => {
    const state = stateWith({
      consumedTimelineEntries: [
        { entryId: "planned-a:unit:1", sourceDrinkId: "planned-a", pureAlcoholMl: 25 },
      ],
    });
    expect(plannedDrinksAtRisk(state)).toBe(1);
  });

  // The blank placeholder row an empty plan carries is not a drink, and
  // counting it would warn the user about losing nothing.
  it("ignores the blank placeholder row", () => {
    const state = stateWith({
      drinks: [{ id: "1", category: "", drink: "", quantity: "", unit: "ml", isCustom: false }],
    });
    expect(plannedDrinksAtRisk(state)).toBe(0);
  });

  it("counts a custom drink by its own name", () => {
    const state = stateWith({
      drinks: [{ id: "c1", drink: "", isCustom: true, customName: "Home negroni", quantity: "90", unit: "ml" }],
    });
    expect(plannedDrinksAtRisk(state)).toBe(1);
  });
});
