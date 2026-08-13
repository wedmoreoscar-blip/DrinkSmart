import { Button } from "@/components/ui/button";
import { fmtMl, PICKER_COPY } from "./picker-copy";

type PickerTrayProps = {
  targetMl: number | null;
  committedMl: number;
  committedCount: number;
  pendingMl: number;
  pendingQuantity: number;
  hasPending: boolean;
  onDone: () => void;
  onAdd: () => void;
};

export const PickerTray = ({
  targetMl,
  committedMl,
  committedCount,
  pendingMl,
  pendingQuantity,
  hasPending,
  onDone,
  onAdd,
}: PickerTrayProps) => {
  const target = targetMl ?? 0;
  const committedPct = target > 0 ? Math.min(100, (committedMl / target) * 100) : 0;
  const pendingPct = target > 0 ? Math.min(100, (pendingMl / target) * 100) : 0;

  const reading = hasPending
    ? `${fmtMl(committedMl)} + ${fmtMl(pendingMl)} ml`
    : target > 0
      ? PICKER_COPY.trayReading(committedMl, target)
      : `${fmtMl(committedMl)} ml`;

  const sub =
    hasPending && target > 0 ? `of ${fmtMl(target)} ml tonight` : PICKER_COPY.traySub(committedCount);

  return (
    <div className="sticky bottom-0 z-10 flex flex-none items-center gap-3.5 border-t border-secondary bg-field px-5 py-3">
      <div className="relative h-[60px] w-[26px] flex-none overflow-hidden rounded-[7px] bg-[#161826] shadow-[0_0_0_1px_#3f424d]">
        <div
          className="absolute inset-x-0 bottom-0 bg-primary"
          style={{ height: `${committedPct}%`, transition: "var(--transition-liquid)" }}
        />
        {pendingPct > 0 && (
          <div
            className="absolute inset-x-0 border-t border-primary bg-[rgba(145,132,217,.22)]"
            style={{
              bottom: `${committedPct}%`,
              height: `${pendingPct}%`,
              transition: "var(--transition-liquid)",
            }}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-lead font-medium leading-[1.1] tabular-nums text-foreground">
          {reading}
        </div>
        <div className="mt-[3px] text-[15px] leading-[1.3] text-muted-foreground">{sub}</div>
      </div>
      <Button
        variant="default"
        size="act"
        className="flex-none whitespace-nowrap px-[26px]"
        onClick={hasPending ? onAdd : onDone}
      >
        {hasPending ? PICKER_COPY.trayPending(pendingQuantity) : PICKER_COPY.trayIdle}
      </Button>
    </div>
  );
};
