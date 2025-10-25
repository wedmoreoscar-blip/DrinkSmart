import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { Home, AlertTriangle, Wine, Droplet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { calculateAlcoholIntake, lbsToKg, getHoursElapsed } from "@/lib/bacCalculations";
import { drinkCategories } from "@/data/drinksData";
import { useMemo } from "react";
import { buzzLevels } from "@/data/buzzLevels";

const ResultsTab = () => {
  const { state } = useAppContext();
  const navigate = useNavigate();

  // Calculate results
  const calculationResults = useMemo(() => {
    // Validate required inputs
    const weight = parseFloat(state.userMetrics.weight);
    const sex = state.userMetrics.sex;
    
    if (!weight || !sex || !state.startDateTime) {
      return null;
    }

    // Convert weight to kg if needed
    const weightKg = state.userMetrics.weightUnit === "lbs" ? lbsToKg(weight) : weight;

    // Get hours elapsed
    const hoursSinceDrinking = getHoursElapsed(state.startDateTime);

    // Use average of target BAC range
    const targetBAC = (state.targetBAC.min + state.targetBAC.max) / 2;

    // Get first drink's ABV if available
    let drinkABV: number | undefined;
    let drinkName: string | undefined;
    
    if (state.drinks.length > 0 && state.drinks[0].drink) {
      const firstDrink = state.drinks[0];
      drinkName = firstDrink.drink;
      
      // Find ABV from drink data
      for (const [_, category] of Object.entries(drinkCategories)) {
        const foundDrink = category.options.find(opt => opt.name === firstDrink.drink);
        if (foundDrink) {
          drinkABV = foundDrink.abv;
          break;
        }
      }
      
      // Use custom ABV if it's a custom drink
      if (firstDrink.customABV) {
        drinkABV = parseFloat(firstDrink.customABV);
      }
    }

    // Calculate
    const result = calculateAlcoholIntake({
      targetBAC,
      weightKg,
      sex,
      hoursSinceDrinking,
      drinkABV,
    });

    return {
      ...result,
      drinkName,
      drinkABV,
      targetBAC,
      hoursSinceDrinking,
    };
  }, [state.userMetrics, state.startDateTime, state.targetBAC, state.drinks]);

  // Get buzz level info
  const buzzLevelInfo = buzzLevels.find(b => b.level === state.inebriationLevel);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Main Results Card */}
      {calculationResults ? (
        <Card className="p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Wine className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold">Your Drinking Plan</h2>
            <p className="text-muted-foreground">
              Target: {buzzLevelInfo?.label || `Level ${state.inebriationLevel}`}
            </p>
          </div>

          {/* Main Result Display */}
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-8 space-y-4">
            {calculationResults.finalAlcoholIntakeMl ? (
              <div className="text-center space-y-2">
                <div className="text-5xl font-bold text-primary">
                  {calculationResults.finalAlcoholIntakeMl.toFixed(0)} ml
                </div>
                <p className="text-xl">
                  of <span className="font-semibold">{calculationResults.drinkName}</span> needed
                </p>
                <p className="text-sm text-muted-foreground">
                  to reach {buzzLevelInfo?.label || "your target level"}
                </p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Droplet className="w-8 h-8 text-primary" />
                  <div className="text-5xl font-bold text-primary">
                    {calculationResults.pureAlcoholMl.toFixed(1)} ml
                  </div>
                </div>
                <p className="text-xl font-semibold">Pure Alcohol Needed</p>
                <p className="text-sm text-muted-foreground">
                  Add a drink in the Drinks tab to see specific volumes
                </p>
              </div>
            )}
          </div>

          {/* Calculation Details */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Wine className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pure Alcohol</p>
                  <p className="text-lg font-semibold">
                    {calculationResults.pureAlcoholMl.toFixed(1)} ml
                  </p>
                </div>
              </div>
            </Card>
            
            {calculationResults.drinkABV && (
              <Card className="p-4 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                    <Droplet className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Drink Strength</p>
                    <p className="text-lg font-semibold">
                      {calculationResults.drinkABV}% ABV
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-primary" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-bold">Missing Information</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Please complete the previous tabs to see your personalized drinking plan:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {!parseFloat(state.userMetrics.weight) && <li>• Add your weight in User Info</li>}
              {!state.userMetrics.sex && <li>• Select your sex in User Info</li>}
              {!state.startDateTime && <li>• Set your start time in Timeline</li>}
            </ul>
          </div>
        </Card>
      )}

      {/* Current State Summary */}
      {calculationResults && (
        <Card className="p-6 bg-muted/30">
          <h3 className="font-semibold mb-4">Calculation Details</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Weight:</span>
              <span className="ml-2 font-medium">
                {state.userMetrics.weight} {state.userMetrics.weightUnit}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Sex:</span>
              <span className="ml-2 font-medium capitalize">{state.userMetrics.sex}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Hours Elapsed:</span>
              <span className="ml-2 font-medium">
                {calculationResults.hoursSinceDrinking.toFixed(1)} hours
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Target BAC:</span>
              <span className="ml-2 font-medium">
                {(calculationResults.targetBAC * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </Card>
      )}

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
        <Button onClick={() => navigate("/")}>
          <Home className="w-4 h-4 mr-2" />
          Return to Welcome
        </Button>
      </div>
    </div>
  );
};

export default ResultsTab;
