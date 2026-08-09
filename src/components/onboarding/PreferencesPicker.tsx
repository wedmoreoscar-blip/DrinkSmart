import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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

const SWEET_STOPS = [0, 0.25, 0.5, 0.75, 1];

const SWEET_LABELS: Record<number, string> = {
  0: "Dry",
  0.25: "Slightly dry",
  0.5: "Balanced",
  0.75: "Slightly sweet",
  1: "Sweet",
};
const STRONG_LABELS: Record<number, string> = {
  0: "Light",
  0.25: "Mild",
  0.5: "Medium",
  0.75: "Strong",
  1: "Very strong",
};

const WordStopRail = ({
  value,
  labels,
  startWord,
  endWord,
  onSelect,
}: {
  value: number;
  labels: Record<number, string>;
  startWord: string;
  endWord: string;
  onSelect: (value: number) => void;
}) => (
  <div className="space-y-2">
    <div className="text-lead font-medium text-foreground">{labels[value] ?? "Balanced"}</div>
    <div className="relative flex h-tap items-center">
      <div className="pointer-events-none absolute inset-x-0 h-px bg-[linear-gradient(to_right,transparent,rgba(233,233,237,.16)_30px,rgba(233,233,237,.16)_calc(100%-30px),transparent)]" />
      <div className="relative flex w-full items-center">
        {SWEET_STOPS.map((stop) => {
          const selected = value === stop;
          return (
            <button
              key={stop}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(stop)}
              className="flex h-tap flex-1 items-center justify-center"
            >
              <span
                className={cn(
                  "rounded-full",
                  selected
                    ? "h-5 w-5 bg-primary shadow-[0_0_0_5px_rgba(145,132,217,.22)]"
                    : "h-[11px] w-[11px] bg-muted",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
    <div className="flex justify-between text-micro text-[#75798c]">
      <span>{startWord}</span>
      <span>{endWord}</span>
    </div>
  </div>
);

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
          <Label>Sweet</Label>
          <WordStopRail
            value={prefs.sweet}
            labels={SWEET_LABELS}
            startWord="Dry"
            endWord="Sweet"
            onSelect={(v) => update({ sweet: v })}
          />
        </div>

        <div className="space-y-2">
          <Label>Strong</Label>
          <WordStopRail
            value={prefs.strong}
            labels={STRONG_LABELS}
            startWord="Light"
            endWord="Very strong"
            onSelect={(v) => update({ strong: v })}
          />
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
