import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  defaultPreferences,
  type PreferenceData,
} from "@/lib/preferences";
import {
  PREFERENCE_FAMILIES,
  type PreferenceFamily,
} from "./preferenceFamilies";
import { ONBOARD2_COPY, ONBOARD2_STOPS } from "./onboardingCopy";
import { STRONG_WORDS } from "@/components/profile/tasteWords";
import { cn } from "@/lib/utils";

type PreferencesPickerProps = {
  initial?: PreferenceData;
  onSubmit?: (prefs: PreferenceData) => void;
  onChange?: (prefs: PreferenceData) => void;
  submitLabel?: string;
  submitting?: boolean;
  onSkip?: () => void;
};

const SWEET_STOPS = [0, 0.25, 0.5, 0.75, 1];

const SWEET_LABELS: Record<number, string> = {
  0: ONBOARD2_STOPS[0],
  0.25: ONBOARD2_STOPS[1],
  0.5: ONBOARD2_STOPS[2],
  0.75: ONBOARD2_STOPS[3],
  1: ONBOARD2_STOPS[4],
};

// Compact rail (5f): the chosen word sits right-aligned on the 15px label line,
// and the end words flank the track inline instead of taking a row of their own.
const WordStopRail = ({
  value,
  labels,
  label,
  startWord,
  endWord,
  onSelect,
}: {
  value: number;
  labels: Record<number, string>;
  label: string;
  startWord: string;
  endWord: string;
  onSelect: (value: number) => void;
}) => (
  <div>
    <div className="flex items-baseline justify-between gap-3">
      <div className="text-[15px] leading-[1.2] text-muted-foreground">{label}</div>
      <div className="text-lead font-medium text-foreground">{labels[value] ?? "Balanced"}</div>
    </div>
    <div className="grid h-tap grid-cols-[72px_minmax(0,1fr)_72px] items-center gap-2.5">
      <div className="text-left text-micro text-[#75798c]">{startWord}</div>
      <div className="relative flex flex-1 items-center">
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
      <div className="text-right text-micro text-[#75798c]">{endWord}</div>
    </div>
  </div>
);

const SectionLabel = ({ children }: { children: string }) => (
  <div className="mb-3 text-micro font-medium uppercase tracking-[0.09em] text-muted-foreground">
    {children}
  </div>
);

export const PreferencesPicker = ({
  initial,
  onSubmit,
  onChange,
  submitLabel = "Start",
  submitting = false,
  onSkip,
}: PreferencesPickerProps) => {
  const [prefs, setPrefs] = useState<PreferenceData>(
    initial ?? defaultPreferences
  );
  const strongBeforeLowNo = useRef<number | null>(null);

  const update = (patch: Partial<PreferenceData>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    onChange?.(next);
  };

  const isFamilySelected = (family: PreferenceFamily) => {
    if (family.keys.length === 0) return prefs.strong === 0;
    return family.keys.some((key) => prefs.categories_liked.includes(key));
  };

  const toggleFamily = (family: PreferenceFamily) => {
    if (family.keys.length === 0) {
      if (prefs.strong === 0) {
        const restored = strongBeforeLowNo.current ?? defaultPreferences.strong;
        strongBeforeLowNo.current = null;
        update({ strong: restored });
      } else {
        strongBeforeLowNo.current = prefs.strong;
        update({ strong: 0 });
      }
      return;
    }
    if (isFamilySelected(family)) {
      update({
        categories_liked: prefs.categories_liked.filter(
          (key) => !family.keys.includes(key)
        ),
      });
    } else {
      update({
        categories_liked: Array.from(
          new Set([...prefs.categories_liked, ...family.keys])
        ),
      });
    }
  };

  return (
    <div>
      <SectionLabel>{ONBOARD2_COPY.categoriesLabel}</SectionLabel>
      <div className="grid grid-cols-2 gap-2.5">
        {PREFERENCE_FAMILIES.map((family) => {
          const selected = isFamilySelected(family);
          return (
            <button
              key={family.label}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleFamily(family)}
              className={cn(
                "flex h-tap items-center justify-center gap-2 rounded-ctl bg-field text-body",
                selected
                  ? "text-foreground shadow-[0_0_0_2px_#9184d9]"
                  : "text-muted-foreground shadow-[0_0_0_1px_#383a46]"
              )}
            >
              {selected && (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  className="flex-none text-primary-hover"
                >
                  <path
                    d="M3.5 8.5l3 3L12.5 5"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {family.label}
            </button>
          );
        })}
      </div>

      <div className="mt-[22px]">
        <SectionLabel>{ONBOARD2_COPY.tasteLabel}</SectionLabel>
        <div className="mt-3 space-y-2">
          <WordStopRail
            value={prefs.sweet}
            labels={SWEET_LABELS}
            label={ONBOARD2_COPY.sweetnessLabel}
            startWord="dry"
            endWord="sweet"
            onSelect={(value) => update({ sweet: value })}
          />
          <WordStopRail
            value={prefs.strong}
            labels={STRONG_WORDS}
            label={ONBOARD2_COPY.strengthLabel}
            startWord="none"
            endWord="very strong"
            onSelect={(value) => update({ strong: value })}
          />
        </div>
        <p className="mt-1.5 text-micro text-[#75798c]">{ONBOARD2_COPY.strengthNote}</p>
      </div>

      {onSubmit && (
        <Button
          type="button"
          size="act"
          className="mt-[18px] w-full"
          disabled={submitting}
          onClick={() => onSubmit(prefs)}
        >
          {submitting ? "Saving..." : submitLabel}
        </Button>
      )}

      {onSkip && (
        <button
          type="button"
          disabled={submitting}
          onClick={onSkip}
          className="mt-1 h-tap w-full text-body text-muted-foreground"
        >
          {ONBOARD2_COPY.skip}
        </button>
      )}
    </div>
  );
};
