import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { defaultMetrics, type UserMetricsData } from "@/hooks/useUserMetrics";

type StatsFormProps = {
  initial?: UserMetricsData | null;
  onSubmit?: (metrics: UserMetricsData) => void;
  onChange?: (metrics: UserMetricsData, valid: boolean) => void;
  submitLabel?: string;
  submitting?: boolean;
  hideSubmit?: boolean;
};

export const StatsForm = ({
  initial,
  onSubmit,
  onChange,
  submitLabel = "Continue",
  submitting = false,
  hideSubmit = false,
}: StatsFormProps) => {
  const [metrics, setMetrics] = useState<UserMetricsData>(
    initial ?? defaultMetrics
  );

  const update = (patch: Partial<UserMetricsData>) =>
    setMetrics((prev) => {
      const next = { ...prev, ...patch };
      return next;
    });

  const heightValid =
    metrics.heightUnit === "cm"
      ? !!metrics.heightCm && parseFloat(metrics.heightCm) > 0
      : !!metrics.heightFt && parseFloat(metrics.heightFt) > 0;
  const weightValid = !!metrics.weight && parseFloat(metrics.weight) > 0;
  const ageValid = !!metrics.age && parseInt(metrics.age) >= 18;
  const sexValid = metrics.sex === "male" || metrics.sex === "female";
  const bodyFatValid =
    metrics.metricType === "bmi" ||
    (!!metrics.bodyFat &&
      parseFloat(metrics.bodyFat) > 0 &&
      parseFloat(metrics.bodyFat) < 100);

  const isValid =
    heightValid && weightValid && ageValid && sexValid && bodyFatValid;

  useEffect(() => {
    onChange?.(metrics, isValid);
  }, [metrics, isValid]);

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold">
            {metrics.metricType === "bmi" ? "Using BMI" : "Using FFM"}
          </p>
          <p className="text-xs text-muted-foreground">
            {metrics.metricType === "bmi"
              ? "Standard calculation"
              : "More accurate, needs body fat %"}
          </p>
        </div>
        <Button
          type="button"
          variant={metrics.metricType === "ffmi" ? "default" : "outline"}
          size="sm"
          onClick={() =>
            update({ metricType: metrics.metricType === "ffmi" ? "bmi" : "ffmi" })
          }
        >
          {metrics.metricType === "ffmi" ? "Use BMI" : "Use FFM"}
        </Button>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Height</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={metrics.heightUnit === "cm" ? "default" : "outline"}
                size="sm"
                onClick={() => update({ heightUnit: "cm" })}
              >
                cm
              </Button>
              <Button
                type="button"
                variant={metrics.heightUnit === "ft" ? "default" : "outline"}
                size="sm"
                onClick={() => update({ heightUnit: "ft" })}
              >
                ft/in
              </Button>
            </div>
          </div>

          {metrics.heightUnit === "cm" ? (
            <Input
              type="number"
              inputMode="numeric"
              placeholder="e.g., 175"
              value={metrics.heightCm}
              onChange={(e) => update({ heightCm: e.target.value })}
            />
          ) : (
            <div className="flex gap-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="ft"
                value={metrics.heightFt}
                onChange={(e) => update({ heightFt: e.target.value })}
                className="flex-1"
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder="in"
                value={metrics.heightIn}
                onChange={(e) => update({ heightIn: e.target.value })}
                className="flex-1"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Weight</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={metrics.weightUnit === "kg" ? "default" : "outline"}
                size="sm"
                onClick={() => update({ weightUnit: "kg" })}
              >
                kg
              </Button>
              <Button
                type="button"
                variant={metrics.weightUnit === "lbs" ? "default" : "outline"}
                size="sm"
                onClick={() => update({ weightUnit: "lbs" })}
              >
                lbs
              </Button>
            </div>
          </div>
          <Input
            type="number"
            inputMode="numeric"
            placeholder={metrics.weightUnit === "kg" ? "e.g., 70" : "e.g., 154"}
            value={metrics.weight}
            onChange={(e) => update({ weight: e.target.value })}
          />
        </div>

        {metrics.metricType === "ffmi" && (
          <div className="space-y-2">
            <Label>Body Fat %</Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="e.g., 15"
              value={metrics.bodyFat}
              onChange={(e) => update({ bodyFat: e.target.value })}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Age</Label>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="e.g., 25"
            value={metrics.age}
            onChange={(e) => update({ age: e.target.value })}
            min={18}
          />
        </div>

        <div className="space-y-2">
          <Label>Sex</Label>
          <Select
            value={metrics.sex}
            onValueChange={(value: "male" | "female") => update({ sex: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your sex" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {!hideSubmit && onSubmit && (
        <Button
          type="button"
          className="w-full"
          disabled={!isValid || submitting}
          onClick={() => onSubmit(metrics)}
        >
          {submitting ? "Saving..." : submitLabel}
        </Button>
      )}
    </div>
  );
};
