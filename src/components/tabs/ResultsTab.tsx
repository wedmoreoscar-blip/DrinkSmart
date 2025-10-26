import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { AlertTriangle, Droplet, Beer, Wine, Martini, ArrowRight } from "lucide-react";
import { buzzLevels } from "@/data/buzzLevels";
import { SHOT_ML, PINT_ML, GLASS_ML, VODKA_ABV, BEER_ABV, WINE_ABV } from "@/lib/drinkConstants";

type ResultsTabProps = {
  onNavigateToDrinks: () => void;
};

const ResultsTab = ({ onNavigateToDrinks }: ResultsTabProps) => {
  const { state } = useAppContext();

  // Calculate pure alcohol needed
  const calculateAlcoholNeeded = () => {
    const { userMetrics, targetBAC, timeDelta } = state;
    
    // Check if we have all required data
    if (!userMetrics.weight || !userMetrics.sex || timeDelta === null) {
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

    // Use average BAC from target range
    const BAC = (targetBAC.min + targetBAC.max) / 2;

    // Calculate pure alcohol in grams
    // Formula: (BAC/100 + (0.00015*time_delta)) * (WEIGHT in grams) * R
    const pureAlcoholGrams = (BAC / 100 + (0.00015 * timeDelta)) * weightInGrams * R;

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
                {alcoholNeeded.ml.toFixed(1)} ml
              </h2>
              <p className="text-lg font-medium">
                of pure alcohol/ethanol needed
              </p>
              <p className="text-muted-foreground">
                to reach <span className="font-semibold text-foreground">Buzz Level {state.inebriationLevel} - {currentBuzzLevel?.label}</span>
              </p>
            </div>
          </Card>

          {/* Drink Equivalents */}
          {drinkEquivalents && (
            <Card className="p-6 bg-background/80">
              <h3 className="text-lg font-semibold mb-4">This is equivalent to:</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Martini className="w-5 h-5 text-primary" />
                  <span className="text-base">
                    <span className="font-bold text-primary">{drinkEquivalents.shots}</span> shots of vodka @37.5% ABV
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Beer className="w-5 h-5 text-primary" />
                  <span className="text-base">
                    <span className="font-bold text-primary">{drinkEquivalents.pints}</span> pints of beer @5% ABV
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Wine className="w-5 h-5 text-primary" />
                  <span className="text-base">
                    <span className="font-bold text-primary">{drinkEquivalents.glasses}</span> glasses of wine @12% ABV
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Standard Measurements */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>* Standard measurements:</p>
            <p className="pl-4">Glass of wine = 175ml</p>
            <p className="pl-4">Shot = 30ml</p>
            <p className="pl-4">Pint = 568ml</p>
          </div>
        </>
      ) : (
        <Card className="p-12 text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-primary" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-bold">Complete Your Profile</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Please fill in your user information (weight and sex) and set your drinking timeline 
              to see personalized alcohol calculations.
            </p>
          </div>
        </Card>
      )}


      {/* Current State Summary */}
      <Card className="p-8 bg-muted/30">
        <h3 className="text-xl font-bold mb-6">Current Configuration</h3>
        
        {/* User Metrics Section */}
        <div>
          <h4 className="text-base font-semibold text-primary mb-4">User Metrics</h4>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-4 bg-background/60">
              <div className="text-sm text-muted-foreground mb-1">Age</div>
              <div className="text-lg font-semibold">{state.userMetrics.age || "Not set"}</div>
            </Card>
            
            <Card className="p-4 bg-background/60">
              <div className="text-sm text-muted-foreground mb-1">Sex</div>
              <div className="text-lg font-semibold capitalize">{state.userMetrics.sex || "Not set"}</div>
            </Card>
            
            <Card className="p-4 bg-background/60">
              <div className="text-sm text-muted-foreground mb-1">Height</div>
              <div className="text-lg font-semibold">
                {state.userMetrics.heightUnit === "cm" 
                  ? (state.userMetrics.heightCm ? `${state.userMetrics.heightCm} cm` : "Not set")
                  : (state.userMetrics.heightFt && state.userMetrics.heightIn 
                      ? `${state.userMetrics.heightFt}' ${state.userMetrics.heightIn}"` 
                      : "Not set")}
              </div>
            </Card>
            
            <Card className="p-4 bg-background/60">
              <div className="text-sm text-muted-foreground mb-1">Weight</div>
              <div className="text-lg font-semibold">
                {state.userMetrics.weight ? `${state.userMetrics.weight} ${state.userMetrics.weightUnit}` : "Not set"}
              </div>
            </Card>
            
            <Card className="p-4 bg-background/60">
              <div className="text-sm text-muted-foreground mb-1">Metric Type</div>
              <div className="text-lg font-semibold">
                {state.userMetrics.metricType === "bmi" ? "BMI" : "FFMI"}
                {state.userMetrics.metricType === "ffmi" && state.userMetrics.bodyFat 
                  ? ` (${state.userMetrics.bodyFat}%)` 
                  : ""}
              </div>
            </Card>
          </div>
        </div>
      </Card>

      {/* Safety Disclaimer */}
      <Card className="p-6 bg-accent/10 border-accent/30">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-accent-foreground">
              Important Safety Reminders
            </p>
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>These calculations are estimates and may vary based on individual factors</li>
              <li>Always err on the side of caution and drink less than recommended</li>
              <li>Never drink and drive - arrange alternative transportation</li>
              <li>Stay hydrated and eat food while drinking</li>
              <li>Know your personal limits and stop if you feel unwell</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-center">
        <Button onClick={onNavigateToDrinks}>
          Go to Drinks Tab
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

    </div>
  );
};

export default ResultsTab;
