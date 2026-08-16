import { describe, expect, it } from "vitest";
import {
  budgetRangeToSlider,
  formatBudgetRange,
  isWideBudgetRange,
  normalizeBudgetRange,
  sliderToBudgetRange,
  BUDGET_SLIDER_MAX_POUNDS,
  WIDE_BUDGET_RANGE,
} from "@/lib/budget";

describe("normalizeBudgetRange", () => {
  it("keeps a well-formed range", () => {
    expect(normalizeBudgetRange(20, 60)).toEqual({ min: 20, max: 60 });
  });

  it("treats a null, absent or unreadable max as no limit", () => {
    expect(normalizeBudgetRange(10, null)).toEqual({ min: 10, max: null });
    expect(normalizeBudgetRange(10, undefined)).toEqual({ min: 10, max: null });
    expect(normalizeBudgetRange(10, "40")).toEqual({ min: 10, max: null });
    expect(normalizeBudgetRange(10, Number.NaN)).toEqual({ min: 10, max: null });
  });

  it("degrades an unreadable or negative floor to zero rather than discarding the range", () => {
    expect(normalizeBudgetRange(undefined, 40)).toEqual({ min: 0, max: 40 });
    expect(normalizeBudgetRange(-15, 40)).toEqual({ min: 0, max: 40 });
  });

  it("widens an inverted range at the top instead of swapping the bounds", () => {
    expect(normalizeBudgetRange(50, 20)).toEqual({ min: 50, max: 50 });
  });

  it("rounds to whole pounds and clamps to the slider's domain", () => {
    expect(normalizeBudgetRange(19.4, 60.6)).toEqual({ min: 19, max: 61 });
    expect(normalizeBudgetRange(500, 900)).toEqual({
      min: BUDGET_SLIDER_MAX_POUNDS,
      max: BUDGET_SLIDER_MAX_POUNDS,
    });
  });
});

describe("isWideBudgetRange", () => {
  it("is true only when neither bound constrains anything", () => {
    expect(isWideBudgetRange(WIDE_BUDGET_RANGE)).toBe(true);
    expect(isWideBudgetRange({ min: 0, max: 60 })).toBe(false);
    expect(isWideBudgetRange({ min: 20, max: null })).toBe(false);
  });
});

describe("slider mapping", () => {
  it("puts no-limit at the top stop rather than at a literal amount", () => {
    expect(budgetRangeToSlider({ min: 0, max: null })).toEqual([0, BUDGET_SLIDER_MAX_POUNDS]);
    expect(sliderToBudgetRange([0, BUDGET_SLIDER_MAX_POUNDS])).toEqual({ min: 0, max: null });
  });

  it("round-trips a bounded range", () => {
    const range = { min: 25, max: 55 };
    expect(sliderToBudgetRange(budgetRangeToSlider(range))).toEqual(range);
  });

  it("never renders the upper handle below the lower one", () => {
    expect(budgetRangeToSlider({ min: 40, max: 10 })).toEqual([40, 40]);
  });

  it("defaults a short slider payload to the wide range", () => {
    expect(sliderToBudgetRange([])).toEqual({ min: 0, max: null });
  });
});

describe("formatBudgetRange", () => {
  it("names the absent ceiling rather than showing the slider's top number", () => {
    expect(formatBudgetRange({ min: 0, max: null })).toBe("£0 – no limit");
    expect(formatBudgetRange({ min: 20, max: 60 })).toBe("£20 – £60");
  });
});
