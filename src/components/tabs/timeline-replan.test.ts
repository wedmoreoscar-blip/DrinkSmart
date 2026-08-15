import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { ConsumedSnapshot, TimelineEntry } from "@/lib/sessionEngine";
import type { CatalogItem } from "@/lib/planCatalog";

const generatePlanMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/generatePlan", async () => {
  const actual = await vi.importActual<typeof import("@/lib/generatePlan")>("@/lib/generatePlan");
  return { ...actual, generatePlan: generatePlanMock };
});

import { remainingReplanBudget, replanRemaining } from "./timeline-replan";

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
  beforeEach(() => generatePlanMock.mockReset());

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

  it("passes live preferences directly into online generation without a profile read", async () => {
    const catalog: CatalogItem[] = [{
      id: "vodka::House",
      name: "House",
      abv: 40,
      typical_ml: 25,
      category: "vodka",
    }];
    const preferences = {
      sweet: 0.2,
      strong: 0.9,
      categories_liked: ["vodka"],
      categories_avoided: [],
    };
    generatePlanMock.mockResolvedValue({
      drinks: [{ catalog_id: "vodka::House", quantity: 1, unit: "shots" }],
      notes: "",
      usedFallback: false,
    });

    const result = await replanRemaining({
      userMetrics: {
        metricType: "bmi",
        heightUnit: "cm",
        weightUnit: "kg",
        heightCm: "180",
        heightFt: "",
        heightIn: "",
        weight: "80",
        bodyFat: "",
        age: "30",
        sex: "male",
      },
      targetBAC: { min: 0.06, max: 0.09 },
      timeDeltaHours: 3,
      preferences,
      drinks: [],
      lockedDrinkIds: [],
      drinkingStartTime: new Date("2026-08-15T18:00:00Z"),
      drinkingTargetTime: new Date("2026-08-15T21:00:00Z"),
      timeline: [],
      consumedSnapshots: [],
      catalog,
      now: new Date("2026-08-15T18:00:00Z"),
    });

    expect(generatePlanMock).toHaveBeenCalledWith(expect.objectContaining({ preferences }));
    expect(result.usedFallback).toBe(false);
    expect(result.entries).toHaveLength(1);

    const source = readFileSync(new URL("./timeline-replan.ts", import.meta.url), "utf8");
    expect(source).not.toContain("fetchPreferences");
    expect(source).not.toContain('.from("profiles")');
  });
});
