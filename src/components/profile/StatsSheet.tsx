import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { defaultMetrics, type UserMetricsData } from "@/hooks/useUserMetrics";

type StatsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: UserMetricsData | null;
  saving: boolean;
  onSave: (metrics: UserMetricsData) => void;
};

export const StatsSheet = ({ open, onOpenChange, initial, saving, onSave }: StatsSheetProps) => {
  const [metrics, setMetrics] = useState<UserMetricsData>({ ...defaultMetrics });

  useEffect(() => {
    if (open) setMetrics(initial ? { ...initial } : { ...defaultMetrics });
  }, [open, initial]);

  const update = (patch: Partial<UserMetricsData>) =>
    setMetrics((prev) => ({ ...prev, ...patch }));

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

  const isValid = heightValid && weightValid && ageValid && sexValid && bodyFatValid;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle className="text-title font-medium">Edit stats</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
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
              <Label>Body fat</Label>
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
              <SelectContent className="z-50 bg-background">
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Method</Label>
            <Select
              value={metrics.metricType}
              onValueChange={(value: "bmi" | "ffmi") => update({ metricType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a method" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                <SelectItem value="bmi">BMI</SelectItem>
                <SelectItem value="ffmi">FFMI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            size="act"
            className="w-full"
            disabled={!isValid || saving}
            onClick={() => onSave(metrics)}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
