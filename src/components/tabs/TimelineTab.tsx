import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppContext } from "@/contexts/AppContext";
import { ArrowRight, Clock, Target } from "lucide-react";
import { formatTimeDisplay, getUnitDisplayText } from "@/lib/timelineHelpers";
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
  onNext: () => void;
};

const TimelineTab = ({ onNext }: TimelineTabProps) => {
  const { state, reorderTimelineEntries } = useAppContext();
  const [currentTime, setCurrentTime] = useState(new Date());

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

    // Convert weight to grams
    const weightInGrams = getWeightInGrams(userMetrics.weight, userMetrics.weightUnit);
    if (!weightInGrams) return null;

    // Get R value based on sex
    const R = userMetrics.sex === "male" ? 0.68 : 0.55;

    // Calculate pure alcohol needed per hour for maintenance
    // Formula: (0.015 / 100) × Weight (grams) × r
    const pureAlcoholGrams = (0.015 / 100) * weightInGrams * R;

    // Convert to ml (divide by 0.789)
    const pureAlcoholMl = pureAlcoholGrams / 0.789;

    return pureAlcoholMl;
  };

  // Calculate drink equivalents for maintenance
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

  // Calculate time delta in hours for display
  const timeDeltaHours = state.timeDelta || 0;

  // Update current time every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => formatTimeDisplay(date);

  const getElapsedTime = () => {
    if (!state.drinkingStartTime) return null;
    
    const elapsed = currentTime.getTime() - state.drinkingStartTime.getTime();
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

  const getCurrentEntryIndex = () => {
    if (!state.drinkingStartTime) return -1;
    
    return state.drinkTimeline.findIndex(entry => entry.time.getTime() > currentTime.getTime()) - 1;
  };

  const currentEntryIndex = getCurrentEntryIndex();

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
              {/* Vertical line */}
              <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-primary/20" />
              
              <SortableContext
                items={state.drinkTimeline.map(
                  (entry) => `${entry.drinkId}-${entry.unitNumber}`
                )}
                strategy={verticalListSortingStrategy}
              >
                {state.drinkTimeline.map((entry, index) => {
                  const isPast = index < currentEntryIndex;
                  const isCurrent = index === currentEntryIndex;
                  const isFuture = index > currentEntryIndex;
                  
                  // Calculate duration based on time between this entry and the next
                  const nextEntry = state.drinkTimeline[index + 1];
                  const durationMinutes = nextEntry 
                    ? Math.round((nextEntry.time.getTime() - entry.time.getTime()) / (1000 * 60))
                    : 0;
                  const isVolumeBased = entry.unit === "ml" || entry.unit === "oz" || entry.unit === "pints" || entry.unit === "glass";
                  
                  // Format duration
                  const formatDuration = (minutes: number) => {
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
                      formatDuration={formatDuration}
                    />
                  );
                })}
              </SortableContext>
              
              {/* Target reached marker */}
              {state.drinkingTargetTime && (
                <div className="relative flex items-start gap-4 pl-12">
                  <div className="absolute left-0 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  
                  <div className="flex-1 pb-2">
                    <div className="font-semibold text-lg">{formatTime(state.drinkingTargetTime)}</div>
                    <div className="text-muted-foreground">🎯 Target time reached</div>
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

      {/* Next Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={onNext}
          className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
        >
          View Results
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default TimelineTab;
