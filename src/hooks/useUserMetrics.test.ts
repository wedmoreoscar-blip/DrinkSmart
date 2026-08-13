import { describe, expect, it } from "vitest";
import { metricsToColumns, type MetricsPersistenceInput } from "@/lib/userMetricsPersistence";

const metrics: MetricsPersistenceInput = {
  metricType: "ffmi",
  heightUnit: "cm",
  weightUnit: "kg",
  heightCm: "180",
  heightFt: "",
  heightIn: "",
  weight: "80",
  bodyFat: "18",
  age: "30",
  sex: "male",
};

describe("metricsToColumns", () => {
  it("honors explicit BMI selection and clears stale body-fat data", () => {
    const result = metricsToColumns({ ...metrics, metricType: "bmi" });
    expect(result.effectiveMetricType).toBe("bmi");
    expect(result.columns.metric_type).toBe("bmi");
    expect(result.columns.body_fat).toBeNull();
  });

  it("persists body fat only for explicit FFMI", () => {
    const result = metricsToColumns(metrics);
    expect(result.effectiveMetricType).toBe("ffmi");
    expect(result.columns.body_fat).toBe(18);
  });
});
