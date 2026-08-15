import { describe, expect, it } from "vitest";
import {
  PLAN_BUILT_COPY,
  entryEthanolLabel,
  entryPortionWord,
  overTargetAdvice,
  planGroupEthanolLabel,
  planGroupVolumeLabel,
} from "./wave5-picker";

describe("Wave 5 picker boundaries", () => {
  it("never exposes the rejected Start tray action", () => {
    expect(PLAN_BUILT_COPY.trayPrimary).toBe("Done");
  });

  it("shows higher-band advice only inside the red interval, with ordered boundaries", () => {
    expect(overTargetAdvice(114.99, 100, 3)).toBeNull();
    expect(overTargetAdvice(115, 100, 3)).toContain("Loose");
    expect(overTargetAdvice(120, 100, 3)).toContain("Loose");
    expect(overTargetAdvice(120.01, 100, 3)).toBeNull();
    expect(overTargetAdvice(119, 100, 7)).toBeNull();
  });

  it("puts absolute serving volume before explicitly labelled ethanol in Plan summaries", () => {
    const sixSingles = [{
      id: "vodka-1",
      category: "vodka",
      drink: "Absolut Vodka",
      customABV: "40",
      quantity: "150",
      unit: "ml" as const,
      portions: 6,
    }];

    expect(planGroupVolumeLabel(sixSingles)).toBe("6 × 25 ml");
    expect(planGroupEthanolLabel(sixSingles, () => 40)).toBe("6 × 10 ml ethanol");
    expect(PLAN_BUILT_COPY.categorySub(6, "6 × 25 ml", "6 × 10 ml ethanol")).toBe(
      "6 picked · 6 × 25 ml · 6 × 10 ml ethanol",
    );
    expect(entryEthanolLabel(sixSingles[0], 40)).toBe("6 × 10 ml ethanol");
    expect(PLAN_BUILT_COPY.drinkSub("6 × 25 ml", "6 × 10 ml ethanol", null)).toBe(
      "6 × 25 ml · 6 × 10 ml ethanol",
    );
  });

  it("falls back to total absolute volume when a category mixes serving sizes", () => {
    expect(
      planGroupVolumeLabel([
        { id: "pints", category: "beer", drink: "Beer", quantity: "1136", unit: "ml", portions: 2 },
        { id: "half", category: "beer", drink: "Beer", quantity: "284", unit: "ml" },
      ]),
    ).toBe("1420 ml total");
  });

  it("renders pint and shot entries as absolute ml rather than semantic serving words", () => {
    expect(
      entryPortionWord({ id: "pint", category: "beer", drink: "Beer", quantity: "1", unit: "pints" }),
    ).toBe("568 ml");
    expect(
      entryPortionWord({ id: "half", category: "beer", drink: "Beer", quantity: "0.5", unit: "pints" }),
    ).toBe("284 ml");
    expect(
      entryPortionWord({ id: "shots", category: "vodka", drink: "Vodka", quantity: "2", unit: "shots" }),
    ).toBe("2 × 30 ml");
  });
});
