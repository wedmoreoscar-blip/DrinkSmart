import { Button } from "@/components/ui/button";
import { VesselMeter } from "@/components/ui/vessel-meter";
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
  addDisabled?: boolean;
  actionLabel?: string;
  traySub?: string;
  advice?: string | null;
  /** Money already committed to the plan; null when nothing priced is in it. */
  cost?: number | null;
  /** Money the pending selection would add; null when it carries no price. */
  pendingCost?: number | null;
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
  addDisabled = false,
  actionLabel,
  traySub,
  advice = null,
  cost = null,
  pendingCost = null,
}: PickerTrayProps) => {
  const target = targetMl ?? 0;
  const reading = hasPending
    ? `${fmtMl(committedMl)} + ${fmtMl(pendingMl)} ml`
    : target > 0
      ? PICKER_COPY.trayReading(committedMl, target)
      : `${fmtMl(committedMl)} ml`;

  // Money reads the way the meter does: what is in the plan, plus what the
  // pending selection would add. Selecting a £4 pint moves it to "£12 + £4",
  // and adding settles it to £16 — the same shape as "100 + 25 ml", so the two
  // readings are learned once.
  const costReading =
    cost != null && pendingCost != null
      ? `£${cost.toFixed(2)} + £${pendingCost.toFixed(2)}`
      : cost != null
        ? `£${cost.toFixed(2)}`
        : pendingCost != null
          ? `£${pendingCost.toFixed(2)}`
          : null;

  const sub =
    traySub ??
    (hasPending && target > 0 ? `of ${fmtMl(target)} ml tonight` : PICKER_COPY.traySub(committedCount));

  return (
    <div className="sticky bottom-0 z-10 -mx-5 flex flex-none items-center gap-3.5 border-t border-[#292b31] bg-[#1c1e2c] px-5 py-3">
      <VesselMeter
        targetMl={target}
        entries={[{ label: "committed", ml: committedMl }]}
        pendingMl={pendingMl}
        variant="tray"
      />
      <div className="min-w-0 flex-1">
        <div className="text-lead font-medium leading-[1.1] tabular-nums text-foreground">
          {reading}
          {costReading != null && (
            <span className="ml-2 text-[#75798c]">· {costReading}</span>
          )}
        </div>
        {advice ? (
          <div className="mt-[5px] text-note leading-[1.4] text-[#cfd3e5]">{advice}</div>
        ) : (
          <div className="mt-[3px] text-[15px] leading-[1.3] text-muted-foreground">{sub}</div>
        )}
      </div>
      <Button
        variant="default"
        size="act"
        className="flex-none whitespace-nowrap px-[26px]"
        disabled={addDisabled}
        onClick={hasPending ? onAdd : onDone}
      >
        {actionLabel ?? (hasPending ? PICKER_COPY.trayPending(pendingQuantity) : PICKER_COPY.trayIdle)}
      </Button>
    </div>
  );
};
