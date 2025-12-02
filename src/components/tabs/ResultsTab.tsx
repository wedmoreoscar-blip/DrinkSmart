import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAppContext } from "@/contexts/AppContext";
import { AlertTriangle, Droplet, Beer, Wine, Martini, ArrowRight, Clock, ChevronDown } from "lucide-react";
import { buzzLevels } from "@/data/buzzLevels";
import { SHOT_ML, PINT_ML, GLASS_ML, VODKA_ABV, BEER_ABV, WINE_ABV } from "@/lib/drinkConstants";
import { formatTimeDisplay } from "@/lib/timelineHelpers";
import { getWeightInKg, getHeightInCm, getTBWGrams } from "@/lib/unitConversions";
import { useState } from "react";

type ResultsTabProps = {
  onNavigateToDrinks: () => void;
};

const ResultsTab = ({ onNavigateToDrinks }: ResultsTabProps) => {
  const { state } = useAppContext();
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);

  // Calculate pure alcohol needed using appropriate TBW formula
  const calculateAlcoholNeeded = () => {
    const { userMetrics, targetBAC, timeDelta } = state;
    
    // Check if we have basic required data
    if (!userMetrics.weight || timeDelta === null) {
      return null;
    }

    // Get weight in kg
    const weightKg = getWeightInKg(userMetrics.weight, userMetrics.weightUnit);
    if (!weightKg) return null;

    // Get height in cm (needed for Watson, not for FFM)
    const heightCm = getHeightInCm(
      userMetrics.heightCm,
      userMetrics.heightFt,
      userMetrics.heightIn,
      userMetrics.heightUnit
    );

    // Calculate Total Body Water using appropriate method (FFM or Watson)
    const tbwGrams = getTBWGrams({
      metricType: userMetrics.metricType,
      bodyFat: userMetrics.bodyFat,
      age: userMetrics.age,
      heightCm,
      weightKg,
      sex: userMetrics.sex,
    });

    if (!tbwGrams) return null;

    // Use average BAC from target range
    const BAC = (targetBAC.min + targetBAC.max) / 2;

    // Calculate pure alcohol in grams using Watson TBW
    // Formula: (BAC/100 + (0.00015 × timeDelta)) × TBW_grams
    const pureAlcoholGrams = (BAC / 100 + (0.00015 * timeDelta)) * tbwGrams;

    // Convert to ml (divide by 0.789)
    const pureAlcoholMl = pureAlcoholGrams / 0.789;

    return {
      grams: pureAlcoholGrams,
      ml: pureAlcoholMl,
    };
  };

  const alcoholNeeded = calculateAlcoholNeeded();
  const currentBuzzLevel = buzzLevels.find((b) => b.level === state.inebriationLevel);

  // Calculate drink equivalents
  const calculateDrinkEquivalents = (pureAlcoholMl: number) => {
    const shots = ((pureAlcoholMl * (1 / VODKA_ABV)) / SHOT_ML);
    const pints = ((pureAlcoholMl * (1 / BEER_ABV)) / PINT_ML);
    const glasses = ((pureAlcoholMl * (1 / WINE_ABV)) / GLASS_ML);
    
    return {
      shots: shots.toFixed(1),
      pints: pints.toFixed(1),
      glasses: glasses.toFixed(1),
    };
  };

  const drinkEquivalents = alcoholNeeded ? calculateDrinkEquivalents(alcoholNeeded.ml) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Alcohol Calculation Result */}
      {alcoholNeeded ? (
        <>
          <Card className="p-8 text-center space-y-6 bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
              <Droplet className="w-10 h-10 text-primary" />
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-primary">
                {state.isTargetAdjusted && state.adjustedTargetMl ? (
                  <>
                    <span className="line-through text-muted-foreground text-2xl">
                      {alcoholNeeded.ml.toFixed(1)} ml
                    </span>
                    {" → "}
                    <span className="text-primary">{state.adjustedTargetMl.toFixed(1)} ml</span>
                  </>
                ) : (
                  `${alcoholNeeded.ml.toFixed(1)} ml`
                )}
              </h2>
              <p className="text-lg font-medium">
                of pure alcohol/ethanol {state.isTargetAdjusted ? "(adjusted for your selection)" : "needed"}
              </p>
              <p className="text-muted-foreground">
                to reach <span className="font-semibold text-foreground">Buzz Level {state.inebriationLevel} - {currentBuzzLevel?.label}</span>
              </p>
            </div>
          </Card>

          {/* Drink Equivalents */}
          {drinkEquivalents && (
            <div className="space-y-4">
              <div className="grid lg:grid-cols-[1fr,auto] gap-6 items-start">
                <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-primary/10">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    This is equivalent to:
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Martini className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="text-2xl font-bold text-primary">{drinkEquivalents.shots}</div>
                        <div className="text-sm text-muted-foreground">shots of vodka @37.5% ABV</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Beer className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="text-2xl font-bold text-primary">{drinkEquivalents.pints}</div>
                        <div className="text-sm text-muted-foreground">pints of beer @5% ABV</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wine className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="text-2xl font-bold text-primary">{drinkEquivalents.glasses}</div>
                        <div className="text-sm text-muted-foreground">glasses of wine @12% ABV</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
              
              <div className="text-sm text-muted-foreground pl-1">
                <span className="font-medium">Standard measurements:</span> Glass of wine = 175ml, Shot = 30ml, Pint = 568ml
              </div>
              
              {/* Warning for extreme buzz levels */}
              {state.inebriationLevel >= 9 && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertDescription>
                    ⚠️ <strong>EXTREME DANGER:</strong> Buzz levels 9 and 10 are life-threatening. This app cannot assist with drink planning at these levels. Please reconsider your target buzz level for your safety.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex justify-center pt-2">
                <Button 
                  onClick={onNavigateToDrinks} 
                  size="lg"
                  className="w-full sm:w-auto group"
                  disabled={state.inebriationLevel >= 9}
                >
                  Add Some Drinks!
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          )}

          {/* Safety Disclaimer */}
          <Card className="p-6 bg-muted/30 border-muted">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold text-sm">Important Safety Reminders</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>These calculations are estimates - always err on the side of caution</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Never drink and drive - arrange alternative transportation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Stay hydrated and eat food while drinking</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Timeline Preview */}
          {state.drinkTimeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Your Drinking Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Collapsible open={isScheduleExpanded} onOpenChange={setIsScheduleExpanded}>
                  <div className="space-y-3">
                    {state.drinkTimeline.slice(0, 4).map((entry) => (
                      <div 
                        key={`${entry.drinkId}-${entry.unitNumber}`}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="text-xl">{entry.icon}</span>
                        <span className="font-semibold min-w-[80px]">
                          {formatTimeDisplay(entry.time)}
                        </span>
                        <span className="text-muted-foreground">
                          Take {entry.unitNumber === 1 && entry.totalUnits === 1 ? "" : `${entry.unitNumber}${entry.unitNumber === 1 ? "st" : entry.unitNumber === 2 ? "nd" : entry.unitNumber === 3 ? "rd" : "th"} `}
                          {entry.drinkName}
                        </span>
                      </div>
                    ))}
                    
                    <CollapsibleContent className="space-y-3">
                      {state.drinkTimeline.slice(4).map((entry) => (
                        <div 
                          key={`${entry.drinkId}-${entry.unitNumber}`}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span className="text-xl">{entry.icon}</span>
                          <span className="font-semibold min-w-[80px]">
                            {formatTimeDisplay(entry.time)}
                          </span>
                          <span className="text-muted-foreground">
                            Take {entry.unitNumber === 1 && entry.totalUnits === 1 ? "" : `${entry.unitNumber}${entry.unitNumber === 1 ? "st" : entry.unitNumber === 2 ? "nd" : entry.unitNumber === 3 ? "rd" : "th"} `}
                            {entry.drinkName}
                          </span>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </div>
                  
                  {state.drinkTimeline.length > 4 && (
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-3"
                      >
                        <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${isScheduleExpanded ? "rotate-180" : ""}`} />
                        {isScheduleExpanded ? "Show Less" : `Show All ${state.drinkTimeline.length} Entries`}
                      </Button>
                    </CollapsibleTrigger>
                  )}
                </Collapsible>
              </CardContent>
            </Card>
          )}

          {/* Calculations Table */}
          {state.drinkCalculations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Drink Breakdown</CardTitle>
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
        </>
      ) : (
        <Card className="p-12 text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-primary" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-bold">Complete Your Profile</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Please fill in your user information (weight and body fat % for FFM mode, OR height, weight, age, and sex for BMI mode) and set your drinking timeline 
              to see personalized alcohol calculations.
            </p>
          </div>
        </Card>
      )}



    </div>
  );
};

export default ResultsTab;
