import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { Home, AlertTriangle, Droplet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { buzzLevels } from "@/data/buzzLevels";

const ResultsTab = () => {
  const { state } = useAppContext();
  const navigate = useNavigate();

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Alcohol Calculation Result */}
      {alcoholNeeded ? (
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

          <div className="grid md:grid-cols-1 gap-4 pt-4">
            <Card className="p-4 bg-background/50">
              <h3 className="font-semibold mb-2">Time to Target</h3>
              <p className="text-2xl font-bold text-primary">
                {state.timeDelta ? `${state.timeDelta.toFixed(1)} hrs` : "N/A"}
              </p>
            </Card>
          </div>
        </Card>
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
      <Card className="p-6 bg-muted/30">
        <h3 className="font-semibold mb-4">Current Configuration</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">User Metrics:</h4>
            <div className="pl-4 space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Age:</span>
                <span className="ml-2 font-medium">{state.userMetrics.age || "Not set"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Sex:</span>
                <span className="ml-2 font-medium capitalize">{state.userMetrics.sex || "Not set"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Height:</span>
                <span className="ml-2 font-medium">
                  {state.userMetrics.heightUnit === "cm" 
                    ? (state.userMetrics.heightCm ? `${state.userMetrics.heightCm} cm` : "Not set")
                    : (state.userMetrics.heightFt && state.userMetrics.heightIn 
                        ? `${state.userMetrics.heightFt}' ${state.userMetrics.heightIn}"` 
                        : "Not set")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Weight:</span>
                <span className="ml-2 font-medium">
                  {state.userMetrics.weight ? `${state.userMetrics.weight} ${state.userMetrics.weightUnit}` : "Not set"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Metric Type:</span>
                <span className="ml-2 font-medium">
                  {state.userMetrics.metricType === "bmi" ? "BMI" : "FFMI"}
                  {state.userMetrics.metricType === "ffmi" && state.userMetrics.bodyFat 
                    ? ` (${state.userMetrics.bodyFat}% body fat)` 
                    : ""}
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 text-sm pt-2 border-t">
            <div>
              <span className="text-muted-foreground">Drinks Added:</span>
              <span className="ml-2 font-medium">{state.drinks.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Time Elapsed:</span>
              <span className="ml-2 font-medium">
                {state.timeDelta ? `${state.timeDelta.toFixed(1)} hrs` : "0 hrs"}
              </span>
            </div>
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
        <Button onClick={() => navigate("/")}>
          <Home className="w-4 h-4 mr-2" />
          Return to Welcome
        </Button>
      </div>
    </div>
  );
};

export default ResultsTab;
