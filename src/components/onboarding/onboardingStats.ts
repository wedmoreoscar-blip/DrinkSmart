import type { UserMetricsData } from "@/hooks/useUserMetrics";

export const BODY_WATER_METHOD_OPTIONS = [
  { label: "BMI", value: "bmi" },
  { label: "FFMI", value: "ffmi" },
] as const;

export const bodyFatIsValidForMethod = (
  metrics: Pick<UserMetricsData, "metricType" | "bodyFat">,
): boolean => {
  if (metrics.metricType === "bmi") return true;
  const bodyFat = parseFloat(metrics.bodyFat);
  return Number.isFinite(bodyFat) && bodyFat > 0 && bodyFat < 100;
};
