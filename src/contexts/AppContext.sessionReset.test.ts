import { describe, expect, it } from "vitest";
import { resetActiveSessionState } from "@/contexts/AppContext";

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
