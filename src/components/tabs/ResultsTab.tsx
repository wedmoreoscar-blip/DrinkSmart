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
              
              <Button 
                onClick={onNavigateToDrinks} 
                size="lg"
                className="lg:mt-12 w-full lg:w-auto group"
              >
                Add Some Drinks!
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          )}

          {/* Safety Disclaimer */}
          <Card className="p-6 bg-muted/30 border-muted">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="space-y-3">
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
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Standard measurements:</span> Glass of wine = 175ml, Shot = 30ml, Pint = 568ml
                  </p>
                </div>
              </div>
            </div>
          </Card>
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



    </div>
  );
};

export default ResultsTab;
