import { describe, expect, it } from "vitest";
import { recordTimelineConsumption } from "./timelineConsumption";
import type { TimelineEntry } from "./sessionEngine";

const entry = (entryId: string, minutes: number): TimelineEntry => ({
  kind: "alcohol",
  entryId,
  drinkId: "lager",
  drinkName: "Lager",
  unitNumber: 1,
  totalUnits: 1,
  time: new Date(minutes * 60_000),
  pureAlcoholMl: 12,
  percentageOfTarget: 25,
  icon: "",
  unit: "ml",
  intervalMinutes: 30,
});

describe("timeline consumption state", () => {
  it("marks an entry consumed without changing the timeline or its times", () => {
    const drinkTimeline = [entry("lager:unit:1", 10), entry("lager:unit:2", 40)];
    const state = { drinkTimeline, consumedTimelineEntries: [] };

    const result = recordTimelineConsumption(
      state,
      "lager:unit:1",
      new Date(12 * 60_000),
    );

    expect(result.drinkTimeline).toBe(drinkTimeline);
    expect(result.drinkTimeline.map((item) => item.time.getTime())).toEqual([
      10 * 60_000,
      40 * 60_000,
    ]);
    expect(result.consumedTimelineEntries).toEqual([
      expect.objectContaining({ entryId: "lager:unit:1", sourceDrinkId: "lager" }),
    ]);
  });
});
