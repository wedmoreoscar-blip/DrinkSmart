import { describe, expect, it } from "vitest";
import {
  findNextUnconsumedAlcoholIndex,
  requiresEarlyConsumptionConfirmation,
} from "./timelineHelpers";

const drink = (entryId: string, time: number) => ({
  kind: "alcohol" as const,
  entryId,
  time: new Date(time),
});

describe("timeline consumption actions", () => {
  it("selects the earliest unconsumed drink even when it is overdue", () => {
    const timeline = [
      { kind: "break" as const, entryId: "water", time: new Date(1_000) },
      drink("first", 2_000),
      drink("second", 20_000),
    ];

    expect(findNextUnconsumedAlcoholIndex(timeline, new Set())).toBe(1);
    expect(findNextUnconsumedAlcoholIndex(timeline, new Set(["first"]))).toBe(2);
    expect(findNextUnconsumedAlcoholIndex(timeline, new Set(["first", "second"]))).toBe(-1);
  });

  it("requires confirmation only before the selected drink's scheduled time", () => {
    const entry = drink("first", 10_000);

    expect(requiresEarlyConsumptionConfirmation(entry, new Date(9_999))).toBe(true);
    expect(requiresEarlyConsumptionConfirmation(entry, new Date(10_000))).toBe(false);
    expect(requiresEarlyConsumptionConfirmation(entry, new Date(20_000))).toBe(false);
  });
});
