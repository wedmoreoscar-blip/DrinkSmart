import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppContext } from "@/contexts/AppContext";
import { ArrowRight, Clock, Target } from "lucide-react";
import { formatTimeDisplay, getUnitDisplayText } from "@/lib/timelineHelpers";

type TimelineTabProps = {
  onNext: () => void;
};

const TimelineTab = ({ onNext }: TimelineTabProps) => {
  const { state } = useAppContext();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Calculate maintenance alcohol per hour
  const calculateMaintenanceAlcohol = () => {
    const { userMetrics } = state;
    
    if (!userMetrics.weight || !userMetrics.sex) {
      return null;
    }

    // Convert weight to grams
    let weightInGrams: number;
    if (userMetrics.weightUnit === "kg") {
      weightInGrams = parseFloat(userMetrics.weight) * 1000;
    } else {
      // Convert lbs to grams (1 lb = 453.592 grams)
      weightInGrams = parseFloat(userMetrics.weight) * 453.592;
    }

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
          <div className="relative space-y-6">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-primary/20" />
            
            {state.drinkTimeline.map((entry, index) => {
              const isPast = index < currentEntryIndex;
              const isCurrent = index === currentEntryIndex;
              const isFuture = index > currentEntryIndex;
              
              return (
                <div 
                  key={`${entry.drinkId}-${entry.unitNumber}`}
                  className="relative flex items-start gap-4 pl-12"
                >
                  {/* Timeline dot */}
                  <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isPast ? "bg-primary/20" : 
                    isCurrent ? "bg-primary animate-pulse" : 
                    "bg-muted border-2 border-primary/30"
                  }`}>
                    {isPast ? (
                      <span className="text-primary">✓</span>
                    ) : (
                      <span className="text-2xl">{entry.icon}</span>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className={`flex-1 pb-2 transition-opacity ${
                    isPast ? "opacity-50" : "opacity-100"
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-lg">{formatTime(entry.time)}</div>
                      <div className="text-sm text-muted-foreground">
                        {getUnitDisplayText(entry.unitNumber, entry.totalUnits, entry.unit)}
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
              );
            })}
            
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
        </CardContent>
      </Card>

      {/* Maintenance Section */}
      {state.drinkingTargetTime && maintenanceMl && maintenanceEquivalents && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="text-center">Maintenance - Keep Your Buzz Going</CardTitle>
            <p className="text-center text-sm text-muted-foreground">
              To maintain your current buzz level, have approximately:
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {maintenanceMl.toFixed(1)} ml
              </div>
              <div className="text-sm text-muted-foreground">
                of pure alcohol per hour
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="text-sm font-medium text-center mb-4">Drink equivalents per hour:</div>
              
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                  <div className="text-2xl">🥃</div>
                  <div className="flex-1">
                    <div className="font-bold text-primary">{maintenanceEquivalents.shots}</div>
                    <div className="text-xs text-muted-foreground">shots of vodka @37.5% ABV</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                  <div className="text-2xl">🍺</div>
                  <div className="flex-1">
                    <div className="font-bold text-primary">{maintenanceEquivalents.pints}</div>
                    <div className="text-xs text-muted-foreground">pints of beer @5% ABV</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                  <div className="text-2xl">🍷</div>
                  <div className="flex-1">
                    <div className="font-bold text-primary">{maintenanceEquivalents.glasses}</div>
                    <div className="text-xs text-muted-foreground">glasses of wine @12% ABV</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculations Summary */}
      {state.drinkCalculations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Drink Calculations Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Drink</th>
                    <th className="text-center py-2 px-2">Quantity</th>
                    <th className="text-center py-2 px-2">Pure Alcohol</th>
                    <th className="text-center py-2 px-2">% of Tank</th>
                    <th className="text-center py-2 px-2">Time Allocated</th>
                    <th className="text-center py-2 px-2">Interval</th>
                  </tr>
                </thead>
                <tbody>
                  {state.drinkCalculations.map((calc, index) => (
                    <tr key={calc.drinkId} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                      <td className="py-2 px-2">{calc.drinkName}</td>
                      <td className="text-center py-2 px-2">{calc.quantity} {calc.unit}</td>
                      <td className="text-center py-2 px-2">{calc.pureAlcoholMl.toFixed(1)} ml</td>
                      <td className="text-center py-2 px-2">{calc.percentageOfTarget.toFixed(1)}%</td>
                      <td className="text-center py-2 px-2">{calc.timeAllocatedMinutes.toFixed(1)} min</td>
                      <td className="text-center py-2 px-2">{calc.intervalMinutes.toFixed(1)} min</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 font-bold">
                    <td className="py-2 px-2">Total</td>
                    <td className="text-center py-2 px-2">—</td>
                    <td className="text-center py-2 px-2">
                      {state.drinkCalculations.reduce((sum, calc) => sum + calc.pureAlcoholMl, 0).toFixed(1)} ml
                    </td>
                    <td className="text-center py-2 px-2">
                      {state.drinkCalculations.reduce((sum, calc) => sum + calc.percentageOfTarget, 0).toFixed(1)}%
                    </td>
                    <td className="text-center py-2 px-2">
                      {state.drinkCalculations.reduce((sum, calc) => sum + calc.timeAllocatedMinutes, 0).toFixed(1)} min
                    </td>
                    <td className="text-center py-2 px-2">—</td>
                  </tr>
                </tbody>
              </table>
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
