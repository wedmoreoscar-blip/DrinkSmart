import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUnitDisplayText } from "@/lib/timelineHelpers";
import { OZ_ML, PINT_ML, SHOT_ML, GLASS_ML } from "@/lib/drinkConstants";
import { sortableIdFor } from "./timeline-replan";

type DrinkTimelineEntry = {
  kind?: "alcohol" | "break";
  drinkId: string;
  entryId: string;
  drinkName: string;
  unitNumber: number;
  totalUnits: number;
  time: Date;
  pureAlcoholMl: number;
  percentageOfTarget: number;
  icon: string;
  unit: string;
  volumeMl?: number;
  durationMinutes?: number;
};

type SortableTimelineItemProps = {
  entry: DrinkTimelineEntry;
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  isDraggable: boolean;
  isLocked: boolean;
  moving: boolean;
  onToggleLock: () => void;
  onSwapRequest: () => void;
};

const getDisplayName = (entry: DrinkTimelineEntry) =>
  entry.drinkName.replace(/^\d+(?:\.\d+)?\s*(?:ml|oz)\s+/i, "");

const formatClock = (date: Date) =>
  date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const getVolumeLabel = (entry: DrinkTimelineEntry) => {
  const match = entry.drinkName.match(/^(\d+(?:\.\d+)?)\s*(ml|oz)\b/i);
  if (match) return `${match[1]} ${match[2].toLowerCase()}`;

  if (typeof entry.volumeMl === "number" && Number.isFinite(entry.volumeMl)) {
    return `${entry.volumeMl} ml`;
  }

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

const SwapIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3.5 7.2h11l-3-3M16.5 12.8h-11l3 3"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Grip = ({
  held,
  onCurrentCard,
  ...dragProps
}: {
  held: boolean;
  onCurrentCard: boolean;
} & Record<string, unknown>) => (
  <button
    type="button"
    aria-label="Press and hold to move this drink"
    className={cn(
      "flex h-9 w-11 flex-none flex-col items-center justify-center gap-1 rounded-md",
      held
        ? "bg-accent shadow-[0_0_0_1px_#9184d9]"
        : onCurrentCard
          ? "bg-card"
          : "bg-field"
    )}
    {...dragProps}
  >
    <span
      className={cn(
        "h-[1.5px] w-[14px] rounded-[1px]",
        held ? "bg-primary-hover" : "bg-[#75798c]"
      )}
    />
    <span
      className={cn(
        "h-[1.5px] w-[14px] rounded-[1px]",
        held ? "bg-primary-hover" : "bg-[#75798c]"
      )}
    />
  </button>
);

export const SortableTimelineItem = ({
  entry,
  isPast,
  isCurrent,
  isFuture,
  isDraggable,
  isLocked,
  moving,
  onToggleLock,
  onSwapRequest,
}: SortableTimelineItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableIdFor(entry),
    disabled: !isDraggable,
  });

  const displayName = getDisplayName(entry);
  const isBreak = entry.pureAlcoholMl === 0 || displayName.toLowerCase().includes("water");
  const isLockedRow = isLocked && !isPast;
  const unitLabel = getUnitDisplayText(entry.unitNumber, entry.totalUnits, entry.unit).replace(/glasss$/, "glass");
  const volumeLabel = getVolumeLabel(entry) || "";

  const detail = isBreak
    ? `${volumeLabel || "330 ml"} · ${isPast ? "had" : `${entry.durationMinutes ?? 0} min`}`
    : isPast
      ? `${volumeLabel || unitLabel} · had`
      : isLockedRow
        ? `${volumeLabel || unitLabel} · kept`
        : isCurrent
          ? `${volumeLabel || unitLabel} · ${entry.pureAlcoholMl.toFixed(1)} ml alc`
          : `${unitLabel} · ${entry.pureAlcoholMl.toFixed(1)} ml`;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
      className={cn(
        "relative",
        isDragging && "z-10",
        isPast && (moving ? "opacity-[.3]" : "opacity-[.45]")
      )}
    >
      <div
        className={
          isDragging
            ? "rounded-lg bg-card shadow-[0_0_0_1px_#9184d9,0_10px_26px_rgba(10,11,18,.6)]"
            : ""
        }
      >
        <div
          className={
            isCurrent
              ? "mx-[-6px] mb-[10px] grid min-h-[98px] grid-cols-[56px_34px_minmax(0,1fr)_56px_56px] items-start rounded-lg bg-field py-2.5 pr-0.5 shadow-[0_0_0_1px_#9184d9]"
              : isPast
                ? "grid min-h-[64px] grid-cols-[56px_34px_minmax(0,1fr)] items-start"
                : "grid min-h-[74px] grid-cols-[56px_34px_minmax(0,1fr)_56px_56px] items-start"
          }
        >
          <div
            className={cn(
              "flex w-14 flex-none flex-col items-start gap-1.5",
              isCurrent && "pl-1.5"
            )}
          >
            <div
              className={cn(
                "text-body tabular-nums",
                isDragging ? "font-medium text-primary-hover" : isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {formatClock(entry.time)}
            </div>
            {!isPast && (
              <Grip
                held={isDragging}
                onCurrentCard={isCurrent}
                {...attributes}
                {...listeners}
                style={{ touchAction: "none" }}
              />
            )}
          </div>

          <div className={isCurrent ? "flex justify-center pt-1" : "flex justify-center pt-1.5"}>
            <div className={markerClass} />
          </div>

          <div className="min-w-0 pl-2.5">
            <div
              className={
                isCurrent
                  ? "text-[25px] leading-[1.2] font-medium tracking-[-0.015em]"
                  : isBreak
                    ? "text-lead leading-[1.25] text-[#cfd3e5]"
                    : "text-lead leading-[1.25]"
              }
            >
              {displayName}
            </div>
            <div
              className={
                isCurrent
                  ? "mt-0.5 text-[15px] leading-[1.35] tabular-nums text-[#cfd3e5]"
                  : "mt-0.5 text-[15px] leading-[1.3] text-muted-foreground"
              }
            >
              {detail}
            </div>
          </div>

          {!isPast && (
            <>
              <button
                type="button"
                onClick={onSwapRequest}
                className="flex h-14 w-14 flex-none items-center justify-center text-muted-foreground"
                title="Swap this drink"
                aria-label="Swap drink"
              >
                <SwapIcon />
              </button>
              <button
                type="button"
                className={cn(
                  "flex h-14 w-14 flex-none items-center justify-center",
                  isLockedRow ? "text-primary" : "text-[#75798c]"
                )}
                onClick={onToggleLock}
                title={
                  isLockedRow
                    ? "Unlock — allow re-plan to replace this drink"
                    : "Lock — keep this drink across re-plans"
                }
                aria-label={isLockedRow ? "Unlock drink" : "Lock drink"}
              >
                <Lock className="h-[18px] w-[18px]" fill={isLockedRow ? "currentColor" : "none"} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
