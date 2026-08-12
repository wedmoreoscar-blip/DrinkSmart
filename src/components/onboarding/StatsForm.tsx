import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { defaultMetrics, type UserMetricsData } from "@/hooks/useUserMetrics";
import { ONBOARD1_ERRORS } from "./onboardingCopy";
import { cn } from "@/lib/utils";

type StatsFormProps = {
  initial?: UserMetricsData | null;
  onSubmit?: (metrics: UserMetricsData) => void;
  onChange?: (metrics: UserMetricsData, valid: boolean) => void;
  submitLabel?: string;
  submitting?: boolean;
  hideSubmit?: boolean;
  showErrors?: boolean;
};

type FieldErrorProps = {
  error?: string | null;
};

const FieldError = ({ error }: FieldErrorProps) => {
  if (!error) return null;
  return (
    <div role="alert" className="mt-2 flex items-start gap-2.5 text-note text-warning">
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className="mt-[2px] flex-none"
      >
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 6v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="10" cy="14" r="1" fill="currentColor" />
      </svg>
      <span>{error}</span>
    </div>
  );
};

type UnitSegmentProps = {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
};

const UnitSegment = ({ options, value, onChange }: UnitSegmentProps) => (
  <div className="flex flex-none overflow-hidden rounded-ctl shadow-[0_0_0_1px_#383a46]">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={cn(
          "h-tap w-[60px] text-body",
          value === option.value
            ? "bg-accent font-medium text-primary-hover"
            : "text-muted-foreground"
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export const StatsForm = ({
  initial,
  onSubmit,
  onChange,
  submitLabel = "Continue",
  submitting = false,
  hideSubmit = false,
  showErrors = false,
}: StatsFormProps) => {
  const [metrics, setMetrics] = useState<UserMetricsData>(
    initial ?? defaultMetrics
  );

  const update = (patch: Partial<UserMetricsData>) =>
    setMetrics((prev) => ({ ...prev, ...patch }));

  const weightKg =
    metrics.weightUnit === "kg"
      ? parseFloat(metrics.weight)
      : parseFloat(metrics.weight) * 0.453592;
  const weightValid = !Number.isNaN(weightKg) && weightKg >= 40 && weightKg <= 250;

  const heightCm =
    metrics.heightUnit === "cm"
      ? parseFloat(metrics.heightCm)
      : parseFloat(metrics.heightFt) * 30.48;
  const heightValid = !Number.isNaN(heightCm) && heightCm >= 120 && heightCm <= 220;

  const age = parseInt(metrics.age, 10);
  const ageValid = !Number.isNaN(age) && age >= 18;

  const sexValid = metrics.sex === "male" || metrics.sex === "female";

  const isValid = weightValid && heightValid && ageValid && sexValid;

  const errors = {
    weight: showErrors && !weightValid ? ONBOARD1_ERRORS.weight : null,
    height: showErrors && !heightValid ? ONBOARD1_ERRORS.height : null,
    age: showErrors && !ageValid ? ONBOARD1_ERRORS.age : null,
  };

  useEffect(() => {
    onChange?.(metrics, isValid);
  }, [metrics, isValid]);

  return (
    <div className="flex flex-col gap-[14px]">
      <div>
        <label
          className={cn(
            "mb-2 block text-label font-medium uppercase text-muted-foreground",
            errors.weight && "text-warning"
          )}
        >
          Weight
        </label>
        <div className="flex gap-2.5">
          <Input
            type="number"
            inputMode="decimal"
            value={metrics.weight}
            onChange={(e) => update({ weight: e.target.value })}
            className={cn(
              "flex-1 text-lead tabular-nums",
              errors.weight && "border-warning"
            )}
          />
          <UnitSegment
            options={[
              { label: "kg", value: "kg" },
              { label: "lb", value: "lbs" },
            ]}
            value={metrics.weightUnit}
            onChange={(value) => update({ weightUnit: value as "kg" | "lbs" })}
          />
        </div>
        <FieldError error={errors.weight} />
      </div>

      <div>
        <label
          className={cn(
            "mb-2 block text-label font-medium uppercase text-muted-foreground",
            errors.height && "text-warning"
          )}
        >
          Height
        </label>
        <div className="flex gap-2.5">
          <Input
            type="number"
            inputMode="decimal"
            value={
              metrics.heightUnit === "cm" ? metrics.heightCm : metrics.heightFt
            }
            onChange={(e) =>
              update(
                metrics.heightUnit === "cm"
                  ? { heightCm: e.target.value }
                  : { heightFt: e.target.value }
              )
            }
            className={cn(
              "flex-1 text-lead tabular-nums",
              errors.height && "border-warning"
            )}
          />
          <UnitSegment
            options={[
              { label: "cm", value: "cm" },
              { label: "ft", value: "ft" },
            ]}
            value={metrics.heightUnit}
            onChange={(value) => update({ heightUnit: value as "cm" | "ft" })}
          />
        </div>
        <FieldError error={errors.height} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label
            className={cn(
              "mb-2 block text-label font-medium uppercase text-muted-foreground",
              errors.age && "text-warning"
            )}
          >
            Age
          </label>
          <Input
            type="number"
            inputMode="numeric"
            value={metrics.age}
            onChange={(e) => update({ age: e.target.value })}
            min={18}
            className={cn(
              "text-lead tabular-nums",
              errors.age && "border-warning"
            )}
          />
          <FieldError error={errors.age} />
        </div>

        <div>
          <label className="mb-2 block text-label font-medium uppercase text-muted-foreground">
            Sex
          </label>
          <Select
            value={metrics.sex}
            onValueChange={(value: "male" | "female") => update({ sex: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your sex" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!hideSubmit && onSubmit && (
        <Button
          type="button"
          size="act"
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
