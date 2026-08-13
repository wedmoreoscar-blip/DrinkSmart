import { describe, expect, it } from "vitest";
import type { ConsumedSnapshot, TimelineEntry } from "@/lib/sessionEngine";
import { remainingReplanBudget } from "./timeline-replan";

const alcohol = (entryId: string, drinkId: string, ml: number): TimelineEntry => ({
  kind: "alcohol",
  entryId,
  drinkId,
  drinkName: drinkId,
  unitNumber: 1,
  totalUnits: 1,
  time: new Date(60_000),
  pureAlcoholMl: ml,
  percentageOfTarget: 20,
  icon: "",
  unit: "ml",
  intervalMinutes: 20,
});

describe("remainingReplanBudget", () => {
  it("subtracts consumed ethanol and locked remaining ethanol exactly once", () => {
    const timeline = [alcohol("a1", "A", 10), alcohol("b1", "B", 5), alcohol("c1", "C", 30)];
    const consumed: ConsumedSnapshot[] = [
      { entryId: "a1", sourceDrinkId: "A", consumedAt: new Date(0), pureAlcoholMl: 10 },
    ];

    expect(
      remainingReplanBudget({
        targetEthanolMl: 60,
        timeline,
        consumedSnapshots: consumed,
        lockedDrinkIds: ["B"],
        now: new Date(0),
      }),
    ).toBe(45);
  });
});
