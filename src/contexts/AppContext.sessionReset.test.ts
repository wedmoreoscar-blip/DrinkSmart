import { describe, expect, it } from "vitest";
import { appSessionStateTransitions } from "@/contexts/AppContext";

const { loadSessionSnapshotState, resetActiveSessionState } = appSessionStateTransitions;

describe("resetActiveSessionState", () => {
  it("destroys the completed night and rebases its chosen duration from now", () => {
    const previous = {
      userMetrics: { weight: "80" },
      inebriationLevel: 4,
      targetBAC: { min: 0.08, max: 0.11 },
      drinks: [{ id: "old", drink: "Old pint" }],
      lockedDrinkIds: ["old"],
      startTime: 90,
      isTimerRunning: true,
      startDateTime: new Date("2026-08-15T18:00:00Z"),
      drinkingStartTime: new Date("2026-08-15T18:00:00Z"),
      drinkingTargetTime: new Date("2026-08-15T22:00:00Z"),
      timeDelta: 4,
      drinkTimeline: [{ entryId: "old:unit:1" }],
      drinkCalculations: [{ drinkId: "old" }],
      adjustedTargetMl: 50,
      isTargetAdjusted: true,
      breaks: [{ entryId: "break-1" }],
      consumedTimelineEntries: [{ entryId: "old:unit:1" }],
      delayedEntryMinutes: { "old:unit:1": 15 },
      effectivePlanEndTime: new Date("2026-08-15T22:15:00Z"),
    } as unknown as Parameters<typeof resetActiveSessionState>[0];
    const now = new Date("2026-08-16T12:30:00Z");

    const next = resetActiveSessionState(previous, now);

    expect(next.userMetrics).toBe(previous.userMetrics);
    expect(next.inebriationLevel).toBe(4);
    expect(next.targetBAC).toBe(previous.targetBAC);
    expect(next.drinks).toEqual([
      { id: "1", category: "", drink: "", quantity: "", unit: "ml", isCustom: false },
    ]);
    expect(next.lockedDrinkIds).toEqual([]);
    expect(next.breaks).toEqual([]);
    expect(next.consumedTimelineEntries).toEqual([]);
    expect(next.delayedEntryMinutes).toEqual({});
    expect(next.drinkTimeline).toEqual([]);
    expect(next.drinkCalculations).toEqual([]);
    expect(next.adjustedTargetMl).toBeNull();
    expect(next.isTargetAdjusted).toBe(false);
    expect(next.effectivePlanEndTime).toBeNull();
    expect(next.startTime).toBe(0);
    expect(next.isTimerRunning).toBe(false);
    expect(next.startDateTime).toBeNull();
    expect(next.drinkingStartTime).toEqual(now);
    expect(next.drinkingStartTime).not.toBe(now);
    expect(next.drinkingTargetTime).toEqual(new Date("2026-08-16T16:30:00Z"));
    expect(next.timeDelta).toBe(4);
  });
});

describe("loadSessionSnapshotState", () => {
  it("loads a snapshot as a clean editable draft with fresh ids and rebased time", () => {
    const previous = {
      userMetrics: { weight: "80" },
      inebriationLevel: 2,
      targetBAC: { min: 0.02, max: 0.05 },
      drinks: [{ id: "old", drink: "Old pint" }],
      lockedDrinkIds: ["old"],
      startTime: 90,
      isTimerRunning: true,
      startDateTime: new Date("2026-08-15T18:00:00Z"),
      drinkingStartTime: new Date("2026-08-15T18:00:00Z"),
      drinkingTargetTime: new Date("2026-08-15T22:00:00Z"),
      timeDelta: 4,
      drinkTimeline: [{ entryId: "old:unit:1" }],
      drinkCalculations: [{ drinkId: "old" }],
      adjustedTargetMl: 50,
      isTargetAdjusted: true,
      breaks: [{ entryId: "break-1" }],
      consumedTimelineEntries: [{ entryId: "old:unit:1" }],
      delayedEntryMinutes: { "old:unit:1": 15 },
      effectivePlanEndTime: new Date("2026-08-15T22:15:00Z"),
    } as unknown as Parameters<typeof loadSessionSnapshotState>[0];
    const now = new Date("2026-08-16T12:30:00Z");
    const snapshot = {
      id: "snapshot-id",
      user_id: "account-id",
      duration_minutes: 210,
      buzz_level: 5,
      completed_at: "2026-08-15T22:00:00Z",
      drinks: [
        { id: "saved-a", category: "Beer & cider", drink: "Lager", quantity: "568", unit: "ml" as const },
        { id: "saved-b", category: "Spirits", drink: "Vodka", quantity: "25", unit: "ml" as const },
      ],
    };

    const next = loadSessionSnapshotState(previous, snapshot, now);

    expect(next.drinks.map((drink) => drink.drink)).toEqual(["Lager", "Vodka"]);
    expect(next.drinks.map((drink) => drink.id)).not.toEqual(["saved-a", "saved-b"]);
    expect(new Set(next.drinks.map((drink) => drink.id)).size).toBe(2);
    expect(next.inebriationLevel).toBe(5);
    expect(next.targetBAC).not.toBe(previous.targetBAC);
    expect(next.lockedDrinkIds).toEqual([]);
    expect(next.breaks).toEqual([]);
    expect(next.consumedTimelineEntries).toEqual([]);
    expect(next.delayedEntryMinutes).toEqual({});
    expect(next.drinkTimeline).toEqual([]);
    expect(next.drinkingStartTime).toEqual(now);
    expect(next.drinkingTargetTime).toEqual(new Date("2026-08-16T16:00:00Z"));
    expect(next.timeDelta).toBe(3.5);
  });
});
