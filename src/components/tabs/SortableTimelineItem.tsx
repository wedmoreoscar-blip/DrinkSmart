import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getUnitDisplayText } from "@/lib/timelineHelpers";
import { OZ_ML, PINT_ML, SHOT_ML, GLASS_ML } from "@/lib/drinkConstants";

type DrinkTimelineEntry = {
  drinkId: string;
  drinkName: string;
  unitNumber: number;
  totalUnits: number;
  time: Date;
  pureAlcoholMl: number;
  percentageOfTarget: number;
  icon: string;
  unit: string;
};

type SortableTimelineItemProps = {
  entry: DrinkTimelineEntry;
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  isDraggable: boolean;
  isLocked: boolean;
  onToggleLock: () => void;
};

const getDisplayName = (entry: DrinkTimelineEntry) =>
  entry.drinkName.replace(/^\d+(?:\.\d+)?\s*(?:ml|oz)\s+/i, "");

const formatClock = (date: Date) =>
  date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const getVolumeLabel = (entry: DrinkTimelineEntry) => {
  const match = entry.drinkName.match(/^(\d+(?:\.\d+)?)\s*(ml|oz)\b/i);
  if (match) return `${match[1]} ${match[2].toLowerCase()}`;

  switch (entry.unit) {
    case "pints":
      return `${PINT_ML} ml`;
    case "shots":
      return `${SHOT_ML} ml`;
    case "glass":
      return `${GLASS_ML} ml`;
    case "oz":
      return `${OZ_ML} ml`;
    default:
      return null;
  }
};

const getVolumeMl = (entry: DrinkTimelineEntry) => {
  const match = entry.drinkName.match(/^(\d+(?:\.\d+)?)\s*(ml|oz)\b/i);
  if (match) {
    const value = parseFloat(match[1]);
    return match[2].toLowerCase() === "oz" ? value * OZ_ML : value;
  }

  switch (entry.unit) {
    case "pints":
      return PINT_ML;
    case "shots":
      return SHOT_ML;
    case "glass":
      return GLASS_ML;
    case "oz":
      return OZ_ML;
    default:
      return null;
  }
};

export const SortableTimelineItem = ({
  entry,
  isPast,
  isCurrent,
  isFuture,
  isDraggable,
  isLocked,
  onToggleLock,
}: SortableTimelineItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${entry.drinkId}-${entry.unitNumber}`,
    disabled: !isDraggable || isLocked,
  });

  const displayName = getDisplayName(entry);
  const isBreak = entry.pureAlcoholMl === 0 || displayName.toLowerCase().includes("water");
  const isLockedRow = isLocked && !isPast && !isCurrent;
  const unitLabel = getUnitDisplayText(entry.unitNumber, entry.totalUnits, entry.unit);
  const volumeLabel = getVolumeLabel(entry);
  const volumeMl = getVolumeMl(entry);
  const abv = volumeMl && entry.pureAlcoholMl > 0 ? (entry.pureAlcoholMl / volumeMl) * 100 : null;

  let detail = isBreak ? "break" : `${unitLabel} · ${volumeLabel || ""}`.trim();
  if (isPast && !isCurrent && !isBreak) detail = `${unitLabel} · had`;
  if (isLockedRow) detail = `${volumeLabel || unitLabel} ${unitLabel} · stays if you re-plan`;
  if (isCurrent && !isBreak) {
    detail = `${volumeLabel || ""} ${unitLabel}${abv !== null ? `, ${abv.toFixed(0)}%` : ""}`.trim();
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const markerClass = isBreak
    ? "h-[13px] w-[13px] rounded-full border border-dashed border-[#9397ab] bg-background"
    : isCurrent
      ? "h-[15px] w-[15px] rounded-full bg-primary shadow-[0_0_0_5px_rgba(145,132,217,.22)]"
      : isLockedRow
        ? "h-[13px] w-[13px] rounded-full border-[1.5px] border-primary bg-background"
        : isPast
          ? "h-[11px] w-[11px] rounded-full bg-[#75798c]"
          : "h-[13px] w-[13px] rounded-full border-[1.5px] border-[#5d5294] bg-background";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isPast && !isCurrent ? "relative z-[1] opacity-[.45]" : "relative z-[1]"}
    >
      <div
        className={
          isCurrent
            ? "grid min-h-[96px] grid-cols-[68px_34px_minmax(0,1fr)] items-start rounded-lg bg-[#1c1e2c] py-3.5 shadow-[0_0_0_1px_#9184d9]"
            : isFuture
              ? "grid min-h-[70px] grid-cols-[62px_34px_minmax(0,1fr)_44px] items-start"
              : "grid min-h-[70px] grid-cols-[62px_34px_minmax(0,1fr)] items-start"
        }
      >
        <div
          className={
            isCurrent
              ? "pt-2 pl-1.5 text-body font-medium tabular-nums text-foreground"
              : "pt-2 text-body tabular-nums text-muted-foreground"
          }
        >
          {formatClock(entry.time)}
        </div>

        <div className={isCurrent ? "flex justify-center pt-1" : "flex justify-center pt-1.5"}>
          <div className={markerClass} />
        </div>

        <div
          {...(isDraggable && isFuture && !isLocked ? attributes : {})}
          {...(isDraggable && isFuture && !isLocked ? listeners : {})}
          className={
            isCurrent
              ? "min-w-0 pr-3.5 pl-3"
              : "min-w-0 pl-3"
          }
          style={isDraggable && isFuture && !isLocked ? { touchAction: "none" } : undefined}
        >
          <div className={isCurrent ? "text-[25px] leading-[1.2] font-medium tracking-[-0.015em]" : "text-lead leading-[1.25]"}>
            {displayName}
            {isLockedRow && (
              <Badge variant="kept" className="ml-2">kept</Badge>
            )}
          </div>

          <div
            className={
              isCurrent
                ? "mt-0.5 text-body leading-[1.35] text-[#cfd3e5]"
                : isBreak
                  ? "mt-0.5 text-[15px] leading-[1.3] text-[#cfd3e5]"
                  : "mt-0.5 text-[15px] leading-[1.3] text-muted-foreground"
            }
          >
            {detail}
          </div>

          {isCurrent && (
            <div className="mt-1.5 text-micro tabular-nums text-[#75798c]">
              {entry.pureAlcoholMl.toFixed(1)} ml · {entry.percentageOfTarget.toFixed(1)}% of target
            </div>
          )}
        </div>

        {!isCurrent && isFuture && (
          <button
            type="button"
            className={
              isLockedRow
                ? "flex h-11 w-11 items-center justify-center text-primary"
                : "flex h-11 w-11 items-center justify-center text-muted-foreground"
            }
            onClick={(event) => {
              event.stopPropagation();
              onToggleLock();
            }}
            title={isLockedRow ? "Unlock — allow regenerate to replace this drink" : "Lock — keep this drink across regenerations"}
            aria-label={isLockedRow ? "Unlock drink" : "Lock drink"}
          >
            <Lock className="h-[18px] w-[18px]" fill={isLockedRow ? "currentColor" : "none"} />
          </button>
        )}
      </div>
    </div>
  );
};
