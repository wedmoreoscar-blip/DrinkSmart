import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTimeDisplay, getUnitDisplayText } from "@/lib/timelineHelpers";

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
  index: number;
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  durationMinutes: number;
  isVolumeBased: boolean;
  isDraggable: boolean;
  isLocked: boolean;
  onToggleLock: () => void;
  formatDuration: (minutes: number) => string;
};

export const SortableTimelineItem = ({
  entry,
  index,
  isPast,
  isCurrent,
  isFuture,
  durationMinutes,
  isVolumeBased,
  isDraggable,
  isLocked,
  onToggleLock,
  formatDuration,
}: SortableTimelineItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${entry.drinkId}-${entry.unitNumber}`,
    disabled: !isDraggable || isLocked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatTime = (date: Date) => formatTimeDisplay(date);

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="relative flex items-start gap-4 pl-12">
        {/* Timeline dot - z-10 ensures it's above the progress line */}
        <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center transition-all z-10 ${
          isPast ? "bg-primary text-primary-foreground shadow-md" : 
          isCurrent ? "bg-primary animate-pulse shadow-lg shadow-primary/40" : 
          "bg-background border-2 border-primary/30"
        }`}>
          {isPast ? (
            <span className="text-primary-foreground font-bold text-lg">✓</span>
          ) : (
            <span className="text-2xl">{entry.icon}</span>
          )}
        </div>
        
        {/* Drag handle - only show for future draggable items */}
        {isDraggable && isFuture && (
          <div
            {...listeners}
            className="absolute left-12 top-0 cursor-grab active:cursor-grabbing p-2 hover:bg-muted/50 rounded transition-colors"
            style={{ touchAction: 'none' }}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        
        {/* Content */}
        <div className={`flex-1 pb-2 transition-opacity ${
          isPast ? "opacity-50" : "opacity-100"
        } ${isDraggable && isFuture ? "ml-10" : ""}`}>
          <div className="flex items-center justify-between mb-1 gap-2">
            <div className="font-semibold text-lg">{formatTime(entry.time)}</div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                {getUnitDisplayText(entry.unitNumber, entry.totalUnits, entry.unit)}
              </div>
              {!isPast && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 ${isLocked ? "text-primary" : "text-muted-foreground"}`}
                  onClick={onToggleLock}
                  title={isLocked ? "Unlock — allow regenerate to replace this drink" : "Lock — keep this drink across regenerations"}
                >
                  {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
          <div className="text-muted-foreground">
            Take {entry.unitNumber === 1 && entry.totalUnits === 1 ? "" : `${entry.unitNumber}${entry.unitNumber === 1 ? "st" : entry.unitNumber === 2 ? "nd" : entry.unitNumber === 3 ? "rd" : "th"} `}
            {entry.drinkName}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {entry.percentageOfTarget.toFixed(1)}% of target • {entry.pureAlcoholMl.toFixed(1)}ml pure alcohol
          </div>
        </div>
      </div>
      
      {/* Duration text between entries */}
      {isVolumeBased && durationMinutes > 0 && (
        <div className={`relative py-2 ${isDraggable && isFuture ? "pl-22" : "pl-12"}`}>
          <div className="text-sm text-muted-foreground font-medium italic">
            ⏱️ Consume over {formatDuration(durationMinutes)}
          </div>
        </div>
      )}
    </div>
  );
};
