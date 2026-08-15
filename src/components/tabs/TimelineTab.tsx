import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppContext } from "@/contexts/AppContext";
import { deriveSessionPhase } from "@/lib/sessionEngine";
import { Bell, BellOff, Clock } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useWebDrinkReminders } from "@/hooks/useWebDrinkReminders";
import { useToast } from "@/hooks/use-toast";
import {
  findNextUnconsumedAlcoholIndex,
  getUnitDisplayText,
  requiresEarlyConsumptionConfirmation,
} from "@/lib/timelineHelpers";
import WindDownScreen from "./WindDownScreen";
import { OZ_ML, PINT_ML, SHOT_ML, GLASS_ML } from "@/lib/drinkConstants";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableTimelineItem } from "./SortableTimelineItem";
import { replanRemaining, sortableIdFor } from "./timeline-replan";
import type { CatalogItem } from "@/lib/planCatalog";
import { fmtMl } from "@/components/picker/picker-copy";

type TimelineTabProps = {
  onNext?: () => void;
  onSwapRequest?: (drinkId: string) => void;
  replanCatalog?: CatalogItem[];
};

type TimelineEntry = {
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

const formatClock = (date: Date) =>
  date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const getDisplayName = (entry: TimelineEntry) =>
  entry.drinkName.replace(/^\d+(?:\.\d+)?\s*(?:ml|oz)\s+/i, "");

const getVolumeLabel = (entry: TimelineEntry) => {
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

const getUnitLabel = (entry: TimelineEntry) =>
  getUnitDisplayText(entry.unitNumber, entry.totalUnits, entry.unit).replace(/glasss$/, "glass");

const TimelineTab = ({ onNext, onSwapRequest, replanCatalog = [] }: TimelineTabProps) => {
  const {
    state,
    reorderTimelineEntries,
    toggleLockedDrink,
    markTimelineEntryHadIt,
    delayTimelineEntry,
    applyRegeneratedRemainingDrinks,
  } = useAppContext();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [webRemindersEnabled, setWebRemindersEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("web-drink-reminders") === "true";
  });
  const [movingEntryId, setMovingEntryId] = useState<string | null>(null);
  const [dropLineY, setDropLineY] = useState<number | null>(null);
  const [replanning, setReplanning] = useState(false);
  const [earlyEntryId, setEarlyEntryId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const {
    isNative,
    notificationsEnabled,
    isLoading: notificationsLoading,
    toggleNotifications,
    scheduleFromTimeline,
  } = useNotifications();

  useWebDrinkReminders(state.drinkTimeline, !isNative && webRemindersEnabled);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 125, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (notificationsEnabled && state.drinkTimeline.length > 0) {
      scheduleFromTimeline(state.drinkTimeline);
    }
  }, [notificationsEnabled, state.drinkTimeline, scheduleFromTimeline]);

  const handleNotificationToggle = async (enabled: boolean) => {
    await toggleNotifications(enabled);
  };

  const handleWebRemindersToggle = (enabled: boolean) => {
    setWebRemindersEnabled(enabled);
    localStorage.setItem("web-drink-reminders", enabled ? "true" : "false");
  };

  const consumedEntryIds = new Set(
    state.consumedTimelineEntries.map((snapshot) => snapshot.entryId)
  );
  const nextEntryIndex = findNextUnconsumedAlcoholIndex(
    state.drinkTimeline,
    consumedEntryIds,
  );
  const firstMovableIndex = Math.max(0, nextEntryIndex);

  const nextEntry = nextEntryIndex >= 0 ? state.drinkTimeline[nextEntryIndex] : null;
  const nextDrink = nextEntry
    ? state.drinks.find((drink) => drink.id === nextEntry.drinkId)
    : undefined;
  const nextDrinkName = nextEntry
    ? nextDrink?.customName || nextDrink?.drink || getDisplayName(nextEntry)
    : "No upcoming drink";
  const nextUnit = nextEntry
    ? getUnitLabel(nextEntry)
    : "Plan ends";
  const nextVolume = nextEntry ? getVolumeLabel(nextEntry) : null;
  const nextDetail = nextEntry
    ? [
        nextVolume ?? nextUnit,
        `${fmtMl(nextEntry.pureAlcoholMl)} ml ethanol`,
        nextVolume && nextEntry.totalUnits > 1 ? nextUnit : null,
        formatClock(nextEntry.time),
      ].filter((part): part is string => part !== null).join(" · ")
    : "Plan ends · —";
  const minutesAway = nextEntry
    ? Math.max(0, Math.ceil((nextEntry.time.getTime() - currentTime.getTime()) / 60000))
    : null;
  const earlyEntry = earlyEntryId
    ? state.drinkTimeline.find(
        (entry) => entry.entryId === earlyEntryId && entry.kind !== "break",
      ) ?? null
    : null;

  const handleHadIt = () => {
    if (!nextEntry) return;
    const consumedAt = new Date();
    if (requiresEarlyConsumptionConfirmation(nextEntry, consumedAt)) {
      setEarlyEntryId(nextEntry.entryId);
      return;
    }
    markTimelineEntryHadIt(nextEntry.entryId, consumedAt);
  };

  const handleConfirmEarlyConsumption = () => {
    if (!earlyEntry) return;
    markTimelineEntryHadIt(earlyEntry.entryId, new Date());
    setEarlyEntryId(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setMovingEntryId(String(event.active.id));
    setDropLineY(null);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const over = event.over;
    if (!over) {
      setDropLineY(null);
      return;
    }
    const overIndex = state.drinkTimeline.findIndex((entry) => sortableIdFor(entry) === over.id);
    if (overIndex < firstMovableIndex) {
      setDropLineY(null);
      return;
    }
    const wrapper = rowRefs.current.get(String(over.id));
    if (!wrapper) {
      setDropLineY(null);
      return;
    }
    const activeRect = event.active.rect.current.translated;
    const below = activeRect ? activeRect.top + activeRect.height / 2 > over.rect.top + over.rect.height / 2 : false;
    setDropLineY(wrapper.offsetTop + (below ? wrapper.offsetHeight : 0));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setMovingEntryId(null);
    setDropLineY(null);
    if (!over || active.id === over.id) return;

    const oldIndex = state.drinkTimeline.findIndex((entry) => sortableIdFor(entry) === active.id);
    const overIndex = state.drinkTimeline.findIndex((entry) => sortableIdFor(entry) === over.id);
    if (oldIndex < 0 || overIndex < 0) return;

    const activeRect = active.rect.current.translated;
    const below = activeRect
      ? activeRect.top + activeRect.height / 2 > over.rect.top + over.rect.height / 2
      : false;
    const target = overIndex + (below ? 1 : 0);
    // A drink cannot be dropped before now: past rows refuse the drop.
    if (target < firstMovableIndex) return;

    const newIndex = oldIndex < target ? target - 1 : target;
    if (newIndex !== oldIndex) {
      reorderTimelineEntries(oldIndex, newIndex);
    }
  };

  const handleDragCancel = () => {
    setMovingEntryId(null);
    setDropLineY(null);
  };

  const handleReplan = async () => {
    if (replanning) return;
    setReplanning(true);
    const result = await replanRemaining({
      userMetrics: state.userMetrics,
      targetBAC: state.targetBAC,
      timeDeltaHours: state.timeDelta,
      drinks: state.drinks,
      lockedDrinkIds: state.lockedDrinkIds,
      drinkingStartTime: state.drinkingStartTime,
      drinkingTargetTime: state.drinkingTargetTime,
      timeline: state.drinkTimeline,
      consumedSnapshots: state.consumedTimelineEntries,
      catalog: replanCatalog,
      now: currentTime,
    });
    setReplanning(false);
    if (result.entries === null) return;
    applyRegeneratedRemainingDrinks(result.entries);
    if (result.usedFallback) {
      toast({
        title: "Built offline",
        description: "AI planner unreachable — used a local plan instead.",
      });
    }
  };

  if (state.drinkTimeline.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-background p-6 text-foreground">
        <Card className="w-full max-w-md p-6 text-center">
          <Clock className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-title font-medium">No Timeline Yet</h2>
          <p className="mt-3 text-body text-muted-foreground">
            Add drinks in the Plan tab to see your personalized drinking schedule.
          </p>
        </Card>
      </div>
    );
  }

  const phase = deriveSessionPhase(
    state.drinkTimeline,
    state.consumedTimelineEntries,
    state.effectivePlanEndTime,
    currentTime,
  );

  if (phase === "winding-down") {
    return <WindDownScreen currentTime={currentTime} onNext={onNext} />;
  }

  const movingEntry = movingEntryId
    ? state.drinkTimeline.find((entry) => sortableIdFor(entry) === movingEntryId)
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <section className="relative shrink-0 border-b border-secondary px-5 pb-5 pt-2">
        {movingEntry && (
          <div className="absolute inset-0 z-[1] flex items-center gap-3 bg-background px-5 pb-5 pt-2">
            <div className="min-w-0 flex-1">
              <div className="text-label font-medium uppercase tracking-[0.09em] text-primary-hover">
                Moving
              </div>
              <div className="mt-1.5 truncate text-[25px] font-medium leading-[1.2] tracking-[-0.015em]">
                {getDisplayName(movingEntry)}
              </div>
              <div className="mt-0.5 text-[15px] leading-[1.35] text-muted-foreground">
                drop it anywhere later tonight
              </div>
            </div>
            <button
              type="button"
              onClick={handleDragCancel}
              className="flex min-h-tap flex-none items-center justify-center rounded-lg border border-border px-[22px] text-body"
            >
              Done
            </button>
          </div>
        )}

        <div className={movingEntry ? "invisible" : undefined} aria-hidden={movingEntry ? true : undefined}>
          <div className="flex items-baseline justify-end">
            <div className="text-label tabular-nums tracking-normal text-muted-foreground">
              now {formatClock(currentTime)}
            </div>
          </div>

          <div className="mt-3 flex items-end gap-[18px]">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[30px] font-medium leading-[1.1] tracking-[-0.015em]">
                {nextDrinkName}
              </div>
              <div className="mt-1 text-[22px] leading-[1.3] tabular-nums text-muted-foreground">
                {nextDetail}
              </div>
            </div>
            <div className="flex-none text-right">
              <div className="text-hero font-medium tabular-nums tracking-[-0.03em]">
                {minutesAway === null ? "—" : minutesAway}
              </div>
              <div className="mt-0.5 text-label font-medium uppercase text-muted-foreground">min away</div>
            </div>
          </div>

          <div className="mt-[18px] flex gap-2.5">
            <button
              type="button"
              className="flex h-16 flex-1 items-center justify-center rounded-lg border border-primary text-lead font-medium text-primary-hover"
              disabled={!nextEntry || movingEntry !== null}
              onClick={handleHadIt}
            >
              Had it
            </button>
            <button
              type="button"
              className="flex h-16 w-[104px] items-center justify-center rounded-lg border border-border text-body text-foreground"
              disabled={!nextEntry || movingEntry !== null}
              onClick={() => nextEntry && delayTimelineEntry(nextEntry.entryId, 15)}
            >
              +15
            </button>
          </div>
        </div>
      </section>

      <AlertDialog
        open={earlyEntry !== null}
        onOpenChange={(open) => {
          if (!open) setEarlyEntryId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log this drink early?</AlertDialogTitle>
            <AlertDialogDescription>
              {earlyEntry
                ? `${getDisplayName(earlyEntry)} is scheduled for ${formatClock(earlyEntry.time)}. Log it as consumed now?`
                : "This drink is scheduled for later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEarlyConsumption}>
              Log it early
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="relative min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-[18px]">
        <div
          className="pointer-events-none absolute left-[73px] top-[26px] bottom-10 z-0 w-px"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(233,233,237,.16) 30px, rgba(233,233,237,.16) calc(100% - 30px), transparent)",
          }}
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={state.drinkTimeline.map(sortableIdFor)}
            strategy={verticalListSortingStrategy}
          >
            <div className="relative z-[1]">
              {dropLineY !== null && (
                <div
                  className="pointer-events-none absolute left-[56px] right-0 z-[2] h-[2px] rounded-[1px] bg-primary"
                  style={{ top: dropLineY }}
                />
              )}

              {state.drinkTimeline.map((entry, index) => {
                const id = sortableIdFor(entry);
                const isPast =
                  consumedEntryIds.has(entry.entryId) ||
                  (entry.kind === "break" && entry.time.getTime() <= currentTime.getTime());
                const isCurrent = index === nextEntryIndex;
                const actionSourceId = entry.kind === "break" ? entry.entryId : entry.drinkId;

                return (
                  <div key={id}>
                    {index === nextEntryIndex && (
                      <div className="mt-[6px] mb-[10px] flex items-center gap-2.5">
                        <div className="w-14 flex-none text-label font-medium uppercase text-primary-hover">
                          now
                        </div>
                        <div
                          className="h-px flex-1"
                          style={{
                            background:
                              "linear-gradient(to right, #9184d9, rgba(145,132,217,.15))",
                          }}
                        />
                      </div>
                    )}
                    <div
                      ref={(element) => {
                        if (element) rowRefs.current.set(id, element);
                        else rowRefs.current.delete(id);
                      }}
                      className="relative"
                    >
                      <SortableTimelineItem
                        entry={entry}
                        isPast={isPast}
                        isCurrent={isCurrent}
                        isDraggable={!isPast}
                        isLocked={state.lockedDrinkIds.includes(actionSourceId)}
                        onToggleLock={() => toggleLockedDrink(actionSourceId)}
                        onSwapRequest={() => onSwapRequest?.(actionSourceId)}
                      />
                    </div>
                  </div>
                );
              })}

              {nextEntryIndex === -1 && (
                <div className="mt-[6px] mb-[10px] flex items-center gap-2.5">
                  <div className="w-14 flex-none text-label font-medium uppercase text-primary-hover">
                    now
                  </div>
                  <div
                    className="h-px flex-1"
                    style={{
                      background:
                        "linear-gradient(to right, #9184d9, rgba(145,132,217,.15))",
                    }}
                  />
                </div>
              )}

              {state.drinkingTargetTime && (
                <div className="grid min-h-[76px] grid-cols-[56px_34px_minmax(0,1fr)] items-start pt-1.5">
                  <div className="pt-1.5 text-body tabular-nums text-muted-foreground">
                    {formatClock(state.drinkingTargetTime)}
                  </div>
                  <div className="flex justify-center pt-3.5">
                    <div className="mt-0.5 h-px w-[23px] bg-[#75798c]" />
                  </div>
                  <div className="pl-3">
                    <div className="text-body leading-[1.3] text-[#cfd3e5]">Plan ends</div>
                  </div>
                </div>
              )}

            </div>
          </SortableContext>
        </DndContext>

        <div className="relative z-[1] flex flex-col gap-3 pb-[18px] pt-1">
          <Card className="border border-border bg-card p-4 shadow-none">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {(isNative ? notificationsEnabled : webRemindersEnabled) ? (
                  <Bell className="h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <BellOff className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <div className="text-body">Drink Reminders</div>
                  <div className="mt-1 text-[15px] leading-[1.3] text-muted-foreground">
                    {isNative
                      ? "Get notified when it’s time for your next drink"
                      : "Get toast alerts when it’s time for your next drink"}
                  </div>
                </div>
              </div>
              <Switch
                checked={isNative ? notificationsEnabled : webRemindersEnabled}
                onCheckedChange={isNative ? handleNotificationToggle : handleWebRemindersToggle}
                disabled={isNative && notificationsLoading}
              />
            </div>
          </Card>
          <div className="text-micro text-[#75798c]">
            Press and hold a grip to move that drink.
          </div>
          <Button
            type="button"
            variant="outline"
            size="tap"
            className="w-full"
            disabled={replanning}
            onClick={handleReplan}
          >
            Re-plan the rest
          </Button>
        </div>
      </section>
    </div>
  );
};

export default TimelineTab;
