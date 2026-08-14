import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { PreferenceData } from "@/lib/preferences";
import { STRONG_WORDS, TASTE_WORDS } from "@/components/profile/tasteWords";

const SWEET_STOPS = [0, 0.25, 0.5, 0.75, 1];

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
      <span className="text-label text-secondary-foreground">{label}</span>
      <span className="text-lead font-medium text-foreground">
        {labels[value] ?? labels[0.5]}
      </span>
    </div>
    <div className="grid min-h-tap grid-cols-[72px_minmax(0,1fr)_72px] items-center gap-2.5">
      <span className="text-left text-micro text-muted-foreground">{startWord}</span>
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
      <span className="whitespace-nowrap text-right text-micro text-muted-foreground">
        {endWord}
      </span>
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
  const [prefs, setPrefs] = useState<PreferenceData>({ ...initial });
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) setPrefs({ ...initial });
    wasOpen.current = open;
  }, [initial, open]);

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
        <div className="mt-4">
          <WordStopRail
            value={prefs.sweet}
            labels={TASTE_WORDS}
            label="Sweetness"
            startWord="dry"
            endWord="sweet"
            onSelect={(v) => update({ sweet: v })}
          />
          <div className="mt-2">
            <WordStopRail
              value={prefs.strong}
              labels={STRONG_WORDS}
              label="Strength"
              startWord="none"
              endWord="very strong"
              onSelect={(v) => update({ strong: v })}
            />
          </div>
          <p className="mt-1.5 text-micro text-muted-foreground">
            Which drinks get picked, not how many.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
