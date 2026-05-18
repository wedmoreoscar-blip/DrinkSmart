import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useAppContext } from "@/contexts/AppContext";
import { Clock, Target, Bell, BellOff, Droplet, Beer, Wine, Martini, Plus, RotateCcw } from "lucide-react";
import { formatTimeDisplay } from "@/lib/timelineHelpers";
import { useNotifications } from "@/hooks/useNotifications";
import { useWebDrinkReminders } from "@/hooks/useWebDrinkReminders";
import { getWeightInKg, getHeightInCm, getTBWGrams } from "@/lib/unitConversions";
import { SHOT_ML, PINT_ML, GLASS_ML, VODKA_ABV, BEER_ABV, WINE_ABV } from "@/lib/drinkConstants";
import { buzzLevels } from "@/data/buzzLevels";
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
import { getWeightInGrams } from "@/lib/unitConversions";

type TimelineTabProps = {
  onNext?: () => void;
};

const TimelineTab = ({ onNext: _onNext }: TimelineTabProps) => {
  const { state, reorderTimelineEntries, toggleLockedDrink, updateDrinks } = useAppContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [webRemindersEnabled, setWebRemindersEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('web-drink-reminders') === 'true';
  });
  
  // Native notification hook
  const {
    isNative,
    notificationsEnabled,
    isLoading: notificationsLoading,
    toggleNotifications,
    scheduleFromTimeline,
  } = useNotifications();

  // Web toast reminders (only when not on native platform)
  useWebDrinkReminders(state.drinkTimeline, !isNative && webRemindersEnabled);

  // Setup drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = state.drinkTimeline.findIndex(
        (entry) => `${entry.drinkId}-${entry.unitNumber}` === active.id
      );
      const newIndex = state.drinkTimeline.findIndex(
        (entry) => `${entry.drinkId}-${entry.unitNumber}` === over.id
      );

      // Only allow reordering if both items are in the future
      const currentEntryIndex = getCurrentEntryIndex();
      if (oldIndex > currentEntryIndex && newIndex > currentEntryIndex) {
        reorderTimelineEntries(oldIndex, newIndex);
      }
    }
  };

  // Calculate maintenance alcohol per hour
  const calculateMaintenanceAlcohol = () => {
    const { userMetrics } = state;
    
    if (!userMetrics.weight || !userMetrics.sex) {
      return null;
    }

    const weightInGrams = getWeightInGrams(userMetrics.weight, userMetrics.weightUnit);
    if (!weightInGrams) return null;

    const R = userMetrics.sex === "male" ? 0.68 : 0.55;
    const pureAlcoholGrams = (0.015 / 100) * weightInGrams * R;
    const pureAlcoholMl = pureAlcoholGrams / 0.789;

    return pureAlcoholMl;
  };

  const calculateMaintenanceEquivalents = (pureAlcoholMl: number) => {
    const SHOT_ML = 30;
    const PINT_ML = 568;
    const GLASS_ML = 175;
    const VODKA_ABV = 0.375;
    const BEER_ABV = 0.05;
    const WINE_ABV = 0.12;

    const shots = (pureAlcoholMl * (1 / VODKA_ABV)) / SHOT_ML;
    const pints = (pureAlcoholMl * (1 / BEER_ABV)) / PINT_ML;
    const glasses = (pureAlcoholMl * (1 / WINE_ABV)) / GLASS_ML;
    
    return {
      shots: shots.toFixed(1),
      pints: pints.toFixed(1),
      glasses: glasses.toFixed(1),
    };
  };

  const maintenanceMl = calculateMaintenanceAlcohol();
  const maintenanceEquivalents = maintenanceMl ? calculateMaintenanceEquivalents(maintenanceMl) : null;

  const timeDeltaHours = state.timeDelta || 0;

  // Pure alcohol needed (absorbed from ResultsTab) — used in the top summary card
  const alcoholNeededMl = useMemo(() => {
    const { userMetrics, targetBAC, timeDelta } = state;
    if (!userMetrics.weight || timeDelta === null) return null;

    const weightKg = getWeightInKg(userMetrics.weight, userMetrics.weightUnit);
    if (!weightKg) return null;

    const heightCm = getHeightInCm(
      userMetrics.heightCm,
      userMetrics.heightFt,
      userMetrics.heightIn,
      userMetrics.heightUnit
    );

    const tbwGrams = getTBWGrams({
      metricType: userMetrics.metricType,
      bodyFat: userMetrics.bodyFat,
      age: userMetrics.age,
      heightCm,
      weightKg,
      sex: userMetrics.sex,
    });
    if (!tbwGrams) return null;

    const BAC = (targetBAC.min + targetBAC.max) / 2;
    const pureAlcoholGrams = (BAC / 100 + 0.00015 * timeDelta) * tbwGrams;
    return pureAlcoholGrams / 0.789;
  }, [state]);

  const drinkEquivalents = useMemo(() => {
    if (alcoholNeededMl === null) return null;
    const ml = state.adjustedTargetMl ?? alcoholNeededMl;
    return {
      shots: ((ml * (1 / VODKA_ABV)) / SHOT_ML).toFixed(1),
      pints: ((ml * (1 / BEER_ABV)) / PINT_ML).toFixed(1),
      glasses: ((ml * (1 / WINE_ABV)) / GLASS_ML).toFixed(1),
    };
  }, [alcoholNeededMl, state.adjustedTargetMl]);

  const currentBuzz = buzzLevels.find((b) => b.level === state.inebriationLevel);

  // Quick-add chips
  const lastFilledDrink = [...state.drinks].reverse().find((d) => d.drink || d.isCustom);

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
      ...state.drinks.filter((d) => d.drink || d.isCustom),
      { id: crypto.randomUUID(), isCustom: false, ...template },
    ]);
  };

  const handleAddLast = () => {
    if (!lastFilledDrink) return;
    updateDrinks([
      ...state.drinks.filter((d) => d.drink || d.isCustom),
      { ...lastFilledDrink, id: crypto.randomUUID() },
    ]);
  };

  // Update current time every second for smooth progress indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Schedule native notifications when timeline changes
  useEffect(() => {
    if (notificationsEnabled && state.drinkTimeline.length > 0) {
      scheduleFromTimeline(state.drinkTimeline);
    }
  }, [notificationsEnabled, state.drinkTimeline, scheduleFromTimeline]);

  // Handle native notification toggle
  const handleNotificationToggle = async (enabled: boolean) => {
    await toggleNotifications(enabled);
  };

  // Handle web reminders toggle
  const handleWebRemindersToggle = (enabled: boolean) => {
    setWebRemindersEnabled(enabled);
    localStorage.setItem('web-drink-reminders', enabled ? 'true' : 'false');
  };

  const formatTime = (date: Date) => formatTimeDisplay(date);

  const getElapsedTime = () => {
    if (!state.drinkingStartTime) return null;
    
    const elapsed = currentTime.getTime() - state.drinkingStartTime.getTime();
    if (elapsed < 0) return null;
    
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getTimeUntilTarget = () => {
    if (!state.drinkingTargetTime) return null;
    
    const remaining = state.drinkingTargetTime.getTime() - currentTime.getTime();
    if (remaining < 0) return "Target reached!";
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Returns index of entry that the live indicator has FULLY passed (for showing tick)
  // We add 2000ms delay so the tick appears only after the indicator fully passes over
  const getCurrentEntryIndex = () => {
    if (!state.drinkingStartTime) return -1;
    
    const passedDelayMs = 2000; // Time after drink event for indicator to fully pass
    return state.drinkTimeline.findIndex(entry => entry.time.getTime() + passedDelayMs > currentTime.getTime()) - 1;
  };

  const currentEntryIndex = getCurrentEntryIndex();

  // Calculate progress indicator position (0 to 100)
  const progressInfo = useMemo(() => {
    if (!state.drinkingStartTime || !state.drinkingTargetTime) {
      return { percentage: 0, isComplete: false, hasStarted: false };
    }

    const startMs = state.drinkingStartTime.getTime();
    const targetMs = state.drinkingTargetTime.getTime();
    const nowMs = currentTime.getTime();

    if (nowMs < startMs) {
      return { percentage: 0, isComplete: false, hasStarted: false };
    }

    if (nowMs >= targetMs) {
      return { percentage: 100, isComplete: true, hasStarted: true };
    }

    const totalDuration = targetMs - startMs;
    const elapsed = nowMs - startMs;
    const percentage = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

    return { percentage, isComplete: false, hasStarted: true };
  }, [state.drinkingStartTime, state.drinkingTargetTime, currentTime]);

  // Empty state
  if (state.drinkTimeline.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Card className="p-12 text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-12 h-12 text-primary" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-bold">No Timeline Yet</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Add drinks in the Drinks tab to see your personalized drinking schedule.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Pure alcohol summary (absorbed from ResultsTab) */}
      {alcoholNeededMl !== null && drinkEquivalents && (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Droplet className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-primary">
                {state.isTargetAdjusted && state.adjustedTargetMl
                  ? `${state.adjustedTargetMl.toFixed(1)} ml`
                  : `${alcoholNeededMl.toFixed(1)} ml`}
              </h2>
              <p className="text-sm text-muted-foreground">
                of pure alcohol for buzz {state.inebriationLevel}
                {currentBuzz ? ` — ${currentBuzz.label}` : ""}
                {state.isTargetAdjusted ? " (adjusted)" : ""}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-background/50">
              <Martini className="w-4 h-4 text-primary mx-auto mb-1" />
              <div className="font-bold">{drinkEquivalents.shots}</div>
              <div className="text-xs text-muted-foreground">shots</div>
            </div>
            <div className="p-2 rounded bg-background/50">
              <Beer className="w-4 h-4 text-primary mx-auto mb-1" />
              <div className="font-bold">{drinkEquivalents.pints}</div>
              <div className="text-xs text-muted-foreground">pints</div>
            </div>
            <div className="p-2 rounded bg-background/50">
              <Wine className="w-4 h-4 text-primary mx-auto mb-1" />
              <div className="font-bold">{drinkEquivalents.glasses}</div>
              <div className="text-xs text-muted-foreground">glasses</div>
            </div>
          </div>
        </Card>
      )}

      {/* Adjustment Notice */}
      {state.isTargetAdjusted && state.adjustedTargetMl && (
        <Alert className="border-blue-500/30 bg-blue-500/10">
          <AlertDescription>
            📊 <strong>Adjusted Timeline:</strong> This timeline distributes your {state.adjustedTargetMl.toFixed(1)}ml 
            of selected drinks across your {timeDeltaHours.toFixed(1)}-hour timeframe for optimal pacing.
          </AlertDescription>
        </Alert>
      )}

      {/* Header Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Current Time</div>
          <div className="text-2xl font-bold">{formatTime(currentTime)}</div>
        </Card>
        
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Time Elapsed</div>
          <div className="text-2xl font-bold">{getElapsedTime() || "Not started"}</div>
        </Card>
        
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Time Until Target</div>
          <div className="text-2xl font-bold">{getTimeUntilTarget() || "—"}</div>
        </Card>
      </div>

      {/* Notification Toggle - Show appropriate version based on platform */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(isNative ? notificationsEnabled : webRemindersEnabled) ? (
              <Bell className="w-5 h-5 text-primary" />
            ) : (
              <BellOff className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <div className="font-medium">Drink Reminders</div>
              <div className="text-sm text-muted-foreground">
                {isNative 
                  ? "Get notified when it's time for your next drink"
                  : "Get toast alerts when it's time for your next drink"
                }
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

      {/* Quick add */}
      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Quick add:</span>
          {lastFilledDrink && (
            <Button size="sm" variant="outline" onClick={handleAddLast} className="h-8 gap-1">
              <RotateCcw className="w-3 h-3" />
              Last drink
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1"
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
            <Plus className="w-3 h-3" /> Shot
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1"
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
            <Plus className="w-3 h-3" /> Beer
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1"
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
            <Plus className="w-3 h-3" /> Wine
          </Button>
        </div>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Your Drinking Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="relative space-y-6">
              {/* Vertical line (background) - z-0 keeps it behind dots */}
              <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-primary/20 z-0" />
              
              {/* Progress line (filled portion) - z-0 keeps it behind dots */}
              {progressInfo.hasStarted && !progressInfo.isComplete && (
                <div 
                  className="absolute left-[19px] top-4 w-0.5 bg-primary z-0 transition-all duration-1000 ease-linear"
                  style={{ 
                    height: `calc(${progressInfo.percentage}% - 16px)`,
                  }}
                />
              )}

              {/* Moving progress indicator */}
              {progressInfo.hasStarted && !progressInfo.isComplete && (
                <div 
                  className="absolute left-[3px] w-[34px] h-[34px] rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center z-20 transition-all duration-1000 ease-linear animate-pulse"
                  style={{ 
                    top: `calc(${progressInfo.percentage}% - 4px)`,
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                </div>
              )}
              
              <SortableContext
                items={state.drinkTimeline.map(
                  (entry) => `${entry.drinkId}-${entry.unitNumber}`
                )}
                strategy={verticalListSortingStrategy}
              >
                {state.drinkTimeline.map((entry, index) => {
                  const isPast = index <= currentEntryIndex;
                  const isCurrent = index === currentEntryIndex;
                  const isFuture = index > currentEntryIndex;
                  
                  const nextEntry = state.drinkTimeline[index + 1];
                  const durationMinutes = nextEntry 
                    ? Math.round((nextEntry.time.getTime() - entry.time.getTime()) / (1000 * 60))
                    : 0;
                  const isVolumeBased = entry.unit === "ml" || entry.unit === "oz" || entry.unit === "pints" || entry.unit === "glass";
                  
                  const formatDuration = (minutes: number) => {
                    if (minutes < 1) {
                      const seconds = Math.round(minutes * 60);
                      return `${seconds}s`;
                    }
                    const hrs = Math.floor(minutes / 60);
                    const mins = Math.round(minutes % 60);
                    if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
                    if (hrs > 0) return `${hrs}h`;
                    return `${mins}m`;
                  };
                  
                  return (
                    <SortableTimelineItem
                      key={`${entry.drinkId}-${entry.unitNumber}`}
                      entry={entry}
                      index={index}
                      isPast={isPast}
                      isCurrent={isCurrent}
                      isFuture={isFuture}
                      durationMinutes={durationMinutes}
                      isVolumeBased={isVolumeBased}
                      isDraggable={isFuture}
                      isLocked={state.lockedDrinkIds.includes(entry.drinkId)}
                      onToggleLock={() => toggleLockedDrink(entry.drinkId)}
                      formatDuration={formatDuration}
                    />
                  );
                })}
              </SortableContext>
              
              {/* Target reached marker */}
              {state.drinkingTargetTime && (
                <div className="relative flex items-start gap-4 pl-12">
                  <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    progressInfo.isComplete 
                      ? 'bg-green-500 scale-110 shadow-lg shadow-green-500/30' 
                      : 'bg-muted'
                  }`}>
                    <Target className={`w-5 h-5 transition-colors ${
                      progressInfo.isComplete ? 'text-white' : 'text-muted-foreground'
                    }`} />
                  </div>
                  
                  <div className="flex-1 pb-2">
                    <div className="font-semibold text-lg">{formatTime(state.drinkingTargetTime)}</div>
                    <div className={`transition-colors ${
                      progressInfo.isComplete ? 'text-green-500 font-medium' : 'text-muted-foreground'
                    }`}>
                      {progressInfo.isComplete ? '✅ Target reached!' : '🎯 Target time'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DndContext>
        </CardContent>
      </Card>

      {/* Maintenance Section - Compact */}
      {state.drinkingTargetTime && maintenanceMl && maintenanceEquivalents && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2 text-primary">Maintenance - Keep Your Buzz Going</h3>
                <p className="text-base font-bold">
                  {maintenanceMl.toFixed(1)} ml pure alcohol/hour ≈ {maintenanceEquivalents.shots} shots 🥃 / {maintenanceEquivalents.pints} pints 🍺 / {maintenanceEquivalents.glasses} glasses 🍷
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default TimelineTab;
