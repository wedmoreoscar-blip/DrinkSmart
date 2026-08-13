export type MetricsPersistenceInput = {
  metricType: "bmi" | "ffmi";
  heightUnit: "cm" | "ft";
  weightUnit: "kg" | "lbs";
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  bodyFat: string;
  age: string;
  sex: "male" | "female" | "";
};

export function metricsToColumns(metrics: MetricsPersistenceInput) {
  const effectiveMetricType = metrics.metricType;

  return {
    columns: {
      height_cm: metrics.heightCm ? parseFloat(metrics.heightCm) : null,
      height_ft: metrics.heightFt ? parseFloat(metrics.heightFt) : null,
      height_in: metrics.heightIn ? parseFloat(metrics.heightIn) : null,
      height_unit: metrics.heightUnit,
      weight: metrics.weight ? parseFloat(metrics.weight) : null,
      weight_unit: metrics.weightUnit,
      body_fat:
        effectiveMetricType === "ffmi" && metrics.bodyFat
          ? parseFloat(metrics.bodyFat)
          : null,
      age: metrics.age ? parseInt(metrics.age) : null,
      sex: metrics.sex || null,
      metric_type: effectiveMetricType,
    },
    effectiveMetricType,
  };
}
