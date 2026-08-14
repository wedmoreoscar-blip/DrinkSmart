import { describe, expect, it } from "vitest";
import { defaultMetrics } from "@/hooks/useUserMetrics";
import {
  BODY_WATER_METHOD_OPTIONS,
  bodyFatIsValidForMethod,
} from "./onboardingStats";

describe("onboarding body-water method", () => {
  it("offers BMI first and FFMI second", () => {
    expect(BODY_WATER_METHOD_OPTIONS).toEqual([
      { label: "BMI", value: "bmi" },
      { label: "FFMI", value: "ffmi" },
    ]);
  });

  it("keeps BMI valid without body fat and requires valid body fat for FFMI", () => {
    expect(bodyFatIsValidForMethod(defaultMetrics)).toBe(true);
    expect(
      bodyFatIsValidForMethod({ metricType: "ffmi", bodyFat: "" }),
    ).toBe(false);
    expect(
      bodyFatIsValidForMethod({ metricType: "ffmi", bodyFat: "18" }),
    ).toBe(true);
    expect(
      bodyFatIsValidForMethod({ metricType: "ffmi", bodyFat: "100" }),
    ).toBe(false);
  });
});
