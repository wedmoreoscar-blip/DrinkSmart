import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { defaultPreferences, type PreferenceData } from "@/lib/preferences";
import { STRONG_WORDS, TASTE_WORDS } from "@/components/profile/tasteWords";

const SWEET_STOPS = [0, 0.25, 0.5, 0.75, 1];

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
    <div className="text-lead font-medium text-foreground">
      {labels[value] ?? labels[0.5]}
    </div>
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

type TasteSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: PreferenceData;
  onChange: (prefs: PreferenceData) => void;
};

export const TasteSheet = ({ open, onOpenChange, initial, onChange }: TasteSheetProps) => {
  const [prefs, setPrefs] = useState<PreferenceData>({ ...defaultPreferences });

  const update = (patch: Partial<PreferenceData>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    onChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle className="text-title font-medium">Taste</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="space-y-2">
            <Label>Sweet</Label>
            <WordStopRail
              value={prefs.sweet}
              labels={TASTE_WORDS}
              startWord="dry"
              endWord="sweet"
              onSelect={(v) => update({ sweet: v })}
            />
          </div>
          <div className="space-y-2">
            <Label>Strong</Label>
            <WordStopRail
              value={prefs.strong}
              labels={STRONG_WORDS}
              startWord="Light"
              endWord="Very strong"
              onSelect={(v) => update({ strong: v })}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
