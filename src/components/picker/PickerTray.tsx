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
  const reading = hasPending
    ? `${fmtMl(committedMl)} + ${fmtMl(pendingMl)} ml`
    : target > 0
      ? PICKER_COPY.trayReading(committedMl, target)
      : `${fmtMl(committedMl)} ml`;

  const sub =
    hasPending && target > 0 ? `of ${fmtMl(target)} ml tonight` : PICKER_COPY.traySub(committedCount);

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
