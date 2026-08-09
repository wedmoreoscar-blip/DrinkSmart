import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAppContext } from "@/contexts/AppContext";
import { Bell, BellOff, Clock, Plus, RotateCcw } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useWebDrinkReminders } from "@/hooks/useWebDrinkReminders";
import { getUnitDisplayText } from "@/lib/timelineHelpers";
import { OZ_ML, PINT_ML, SHOT_ML, GLASS_ML } from "@/lib/drinkConstants";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableTimelineItem } from "./SortableTimelineItem";

type TimelineTabProps = {
  onNext?: () => void;
};

type TimelineEntry = {
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

const formatClock = (date: Date) =>
  date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const getDisplayName = (entry: TimelineEntry) =>
  entry.drinkName.replace(/^\d+(?:\.\d+)?\s*(?:ml|oz)\s+/i, "");

const getVolumeLabel = (entry: TimelineEntry) => {
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

const getUnitLabel = (entry: TimelineEntry) =>
  getUnitDisplayText(entry.unitNumber, entry.totalUnits, entry.unit).replace(/glasss$/, "glass");

const TimelineTab = ({ onNext }: TimelineTabProps) => {
  const { state, reorderTimelineEntries, toggleLockedDrink, updateDrinks } = useAppContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [webRemindersEnabled, setWebRemindersEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("web-drink-reminders") === "true";
  });

  const {
    isNative,
    notificationsEnabled,
    isLoading: notificationsLoading,
    toggleNotifications,
    scheduleFromTimeline,
  } = useNotifications();

  useWebDrinkReminders(state.drinkTimeline, !isNative && webRemindersEnabled);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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

  const lastFilledDrink = [...state.drinks].reverse().find((drink) => drink.drink || drink.isCustom);

  const quickAdd = (template: {
    category: string;
    drink: string;
    customABV: string;
    quantity: string;
    unit: "ml" | "oz" | "shots" | "pints" | "glass";
    isCustom?: boolean;
    customName?: string;
  }) => {
    updateDrinks([
      ...state.drinks.filter((drink) => drink.drink || drink.isCustom),
      { id: crypto.randomUUID(), isCustom: false, ...template },
    ]);
  };

  const handleAddLast = () => {
    if (!lastFilledDrink) return;
    updateDrinks([
      ...state.drinks.filter((drink) => drink.drink || drink.isCustom),
      { ...lastFilledDrink, id: crypto.randomUUID() },
    ]);
  };

  const getCurrentEntryIndex = () => {
    if (!state.drinkingStartTime) return -1;
    const passedDelayMs = 2000;
    return state.drinkTimeline.findIndex(
      (entry) => entry.time.getTime() + passedDelayMs > currentTime.getTime(),
    ) - 1;
  };

  const currentEntryIndex = getCurrentEntryIndex();
  const nextEntryIndex = state.drinkTimeline.findIndex(
    (entry) => entry.time.getTime() > currentTime.getTime(),
  );
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
    ? `${nextVolume ? `${nextVolume} ` : ""}${nextUnit} · ${formatClock(nextEntry.time)}`
    : "Plan ends · —";
  const minutesAway = nextEntry
    ? Math.max(0, Math.ceil((nextEntry.time.getTime() - currentTime.getTime()) / 60000))
    : null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = state.drinkTimeline.findIndex(
      (entry) => `${entry.drinkId}-${entry.unitNumber}` === active.id,
    );
    const newIndex = state.drinkTimeline.findIndex(
      (entry) => `${entry.drinkId}-${entry.unitNumber}` === over.id,
    );

    if (oldIndex > currentEntryIndex && newIndex > currentEntryIndex) {
      reorderTimelineEntries(oldIndex, newIndex);
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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <section className="shrink-0 border-b border-secondary px-5 pb-5 pt-2">
        <div className="flex items-baseline justify-between">
          <div className="text-label font-medium uppercase tracking-[0.09em] text-primary-hover">Next</div>
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
            disabled
            aria-disabled="true"
            title="Had it is blocked until timeline engine support is available"
          >
            Had it
          </button>
          <button
            type="button"
            className="flex h-16 w-[104px] items-center justify-center rounded-lg border border-border text-body text-foreground"
            disabled
            aria-disabled="true"
            title="+15 replanning is blocked until timeline engine support is available"
          >
            +15
          </button>
        </div>
      </section>

      <section className="relative min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-[18px]">
        <div
          className="pointer-events-none absolute left-[97px] top-[26px] bottom-10 z-0 w-px"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(233,233,237,.16) 30px, rgba(233,233,237,.16) calc(100% - 30px), transparent)",
          }}
        />

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={state.drinkTimeline.map((entry) => `${entry.drinkId}-${entry.unitNumber}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="relative z-[1]">
              {state.drinkTimeline.map((entry, index) => {
                const isPast = entry.time.getTime() <= currentTime.getTime();
                const isCurrent = index === nextEntryIndex;
                const isFuture = !isPast && !isCurrent;

                return (
                  <div key={`${entry.drinkId}-${entry.unitNumber}`}>
                    {index === nextEntryIndex && (
                      <div className="mt-[6px] mb-[10px] flex items-center gap-2.5">
                        <div className="w-[62px] flex-none text-label font-medium uppercase text-primary-hover">
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
                    <SortableTimelineItem
                      entry={entry}
                      isPast={isPast}
                      isCurrent={isCurrent}
                      isFuture={isFuture}
                      isDraggable={isFuture}
                      isLocked={state.lockedDrinkIds.includes(entry.drinkId)}
                      onToggleLock={() => toggleLockedDrink(entry.drinkId)}
                    />
                  </div>
                );
              })}

              {nextEntryIndex === -1 && (
                <div className="mt-[6px] mb-[10px] flex items-center gap-2.5">
                  <div className="w-[62px] flex-none text-label font-medium uppercase text-primary-hover">
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

              <div className="mb-4 space-y-3">
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

                <Card className="border border-border bg-card p-4 shadow-none">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] text-muted-foreground">Quick add:</span>
                    {lastFilledDrink && (
                      <Button size="sm" variant="outline" onClick={handleAddLast} className="min-h-14 gap-1">
                        <RotateCcw className="h-3 w-3" />
                        Last drink
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-14 gap-1"
                      onClick={() =>
                        quickAdd({
                          category: "shots",
                          drink: "Vodka Shot",
                          customABV: "37.5",
                          quantity: "1",
                          unit: "shots",
                        })
                      }
                    >
                      <Plus className="h-3 w-3" /> Shot
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-14 gap-1"
                      onClick={() =>
                        quickAdd({
                          category: "beer_pint",
                          drink: "Carling",
                          customABV: "4.0",
                          quantity: "1",
                          unit: "pints",
                        })
                      }
                    >
                      <Plus className="h-3 w-3" /> Beer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-14 gap-1"
                      onClick={() =>
                        quickAdd({
                          category: "wine_red",
                          drink: "House Red",
                          customABV: "12",
                          quantity: "1",
                          unit: "glass",
                        })
                      }
                    >
                      <Plus className="h-3 w-3" /> Wine
                    </Button>
                  </div>
                </Card>
              </div>

              {state.drinkingTargetTime && (
                <div className="grid min-h-[76px] grid-cols-[62px_34px_minmax(0,1fr)] items-start pt-1.5">
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

              <div className="flex gap-2.5 px-0 py-2 pb-[18px]">
                <button
                  type="button"
                  onClick={() => onNext?.()}
                  className="min-h-14 flex-1 rounded-lg border border-border text-body text-foreground"
                >
                  Add a drink
                </button>
                <button
                  type="button"
                  onClick={() => onNext?.()}
                  className="min-h-14 flex-1 rounded-lg border border-border text-body text-foreground"
                >
                  Re-plan the rest
                </button>
              </div>
            </div>
          </SortableContext>

        </DndContext>
      </section>
    </div>
  );
};

export default TimelineTab;
