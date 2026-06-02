import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  defaultPreferences,
  preferenceCategoryKeys,
  getCategoryLabel,
  type PreferenceData,
} from "@/lib/preferences";
import { cn } from "@/lib/utils";

type PreferencesPickerProps = {
  initial?: PreferenceData;
  onSubmit?: (prefs: PreferenceData) => void;
  onChange?: (prefs: PreferenceData) => void;
  submitLabel?: string;
  submitting?: boolean;
};

const SWEET_LABELS: Record<number, string> = {
  0: "Dry",
  0.5: "Balanced",
  1: "Sweet",
};
const STRONG_LABELS: Record<number, string> = {
  0: "Light",
  0.5: "Medium",
  1: "Strong",
};

export const PreferencesPicker = ({
  initial,
  onSubmit,
  onChange,
  submitLabel = "Finish",
  submitting = false,
}: PreferencesPickerProps) => {
  const [prefs, setPrefs] = useState<PreferenceData>(initial ?? defaultPreferences);

  const update = (patch: Partial<PreferenceData>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    onChange?.(next);
  };

  const toggleLike = (key: string) => {
    if (prefs.categories_liked.includes(key)) {
      update({ categories_liked: prefs.categories_liked.filter((k) => k !== key) });
    } else {
      update({
        categories_liked: [...prefs.categories_liked, key],
        categories_avoided: prefs.categories_avoided.filter((k) => k !== key),
      });
    }
  };

  const toggleAvoid = (key: string) => {
    if (prefs.categories_avoided.includes(key)) {
      update({
        categories_avoided: prefs.categories_avoided.filter((k) => k !== key),
      });
    } else {
      update({
        categories_avoided: [...prefs.categories_avoided, key],
        categories_liked: prefs.categories_liked.filter((k) => k !== key),
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Sweet</Label>
            <span className="text-xs text-muted-foreground">
              {SWEET_LABELS[prefs.sweet] ?? "Balanced"}
            </span>
          </div>
          <Slider
            value={[prefs.sweet]}
            min={0}
            max={1}
            step={0.5}
            onValueChange={([v]) => update({ sweet: v })}
          />
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>Dry</span>
            <span>Balanced</span>
            <span>Sweet</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Strong</Label>
            <span className="text-xs text-muted-foreground">
              {STRONG_LABELS[prefs.strong] ?? "Medium"}
            </span>
          </div>
          <Slider
            value={[prefs.strong]}
            min={0}
            max={1}
            step={0.5}
            onValueChange={([v]) => update({ strong: v })}
          />
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>Light</span>
            <span>Medium</span>
            <span>Strong</span>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <Label>I like</Label>
          <p className="text-xs text-muted-foreground">
            Tap to favourite. We'll lean into these.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {preferenceCategoryKeys.map((key) => {
            const liked = prefs.categories_liked.includes(key);
            return (
              <button
                key={`like-${key}`}
                type="button"
                onClick={() => toggleLike(key)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm border transition-colors",
                  liked
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border"
                )}
              >
                {getCategoryLabel(key)}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <Label>I avoid</Label>
          <p className="text-xs text-muted-foreground">
            Tap to exclude. We'll skip these entirely.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {preferenceCategoryKeys.map((key) => {
            const avoided = prefs.categories_avoided.includes(key);
            return (
              <button
                key={`avoid-${key}`}
                type="button"
                onClick={() => toggleAvoid(key)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm border transition-colors",
                  avoided
                    ? "bg-destructive text-destructive-foreground border-destructive"
                    : "bg-background hover:bg-muted border-border"
                )}
              >
                {getCategoryLabel(key)}
              </button>
            );
          })}
        </div>
      </Card>

      {onSubmit && (
        <Button
          type="button"
          className="w-full"
          disabled={submitting}
          onClick={() => onSubmit(prefs)}
        >
          {submitting ? "Saving..." : submitLabel}
        </Button>
      )}
    </div>
  );
};
