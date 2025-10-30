import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppContext } from "@/contexts/AppContext";
import { ArrowRight, Plus, X, RefreshCw, Check, ChevronsUpDown, RotateCcw, Battery } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { drinkCategories } from "@/data/drinksData";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { PINT_ML, OZ_ML, SHOT_ML } from "@/lib/drinkConstants";

type DrinkEntry = {
  id: string;
  category: string;
  drink: string;
  customABV?: string;
  quantity: string;
  unit: "ml" | "oz" | "shots" | "pints";
  mixer?: string;
};

type FlattenedDrink = {
  name: string;
  abv: number;
  category: string;
};

// Flatten all drinks into a searchable array
const allDrinks: FlattenedDrink[] = Object.entries(drinkCategories).flatMap(([categoryKey, category]) =>
  category.options.map(option => ({
    name: option.name,
    abv: option.abv,
    category: categoryKey,
  }))
);

// Determine default unit based on category
const getDefaultUnit = (category: string): "ml" | "oz" | "shots" | "pints" => {
  if (category.includes("beer") || category.includes("cider")) return "pints";
  if (category === "shots") return "shots";
  return "ml";
};

const DrinksTab = ({ onNext }: { onNext: () => void }) => {
  const { state, updateDrinks, recalculate, calculateDrinkTimeline } = useAppContext();
  const drinks = state.drinks;
  const { toast } = useToast();
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

  // Check if buzz level is too high
  const isExtremeBuzzLevel = state.inebriationLevel >= 9;

  // Calculate total pure alcohol needed (from Results calculation)
  const calculateTotalPureAlcoholNeeded = () => {
    const { userMetrics, targetBAC, timeDelta } = state;
    
    if (!userMetrics.weight || !userMetrics.sex || timeDelta === null) {
      return null;
    }

    // Convert weight to grams
    let weightInGrams: number;
    if (userMetrics.weightUnit === "kg") {
      weightInGrams = parseFloat(userMetrics.weight) * 1000;
    } else {
      weightInGrams = parseFloat(userMetrics.weight) * 453.592;
    }

    const R = userMetrics.sex === "male" ? 0.68 : 0.55;
    const BAC = (targetBAC.min + targetBAC.max) / 2;
    const pureAlcoholGrams = (BAC / 100 + (0.00015 * timeDelta)) * weightInGrams * R;
    const pureAlcoholMl = pureAlcoholGrams / 0.789;

    return pureAlcoholMl;
  };

  // Calculate pure alcohol from drinks
  const calculatePureAlcoholChosen = () => {
    return drinks.reduce((total, drink) => {
      if (!drink.quantity || !drink.drink) return total;

      const quantity = parseFloat(drink.quantity);
      if (isNaN(quantity)) return total;

      // Convert to ml
      let volumeMl = 0;
      switch (drink.unit) {
        case "pints":
          volumeMl = quantity * PINT_ML;
          break;
        case "oz":
          volumeMl = quantity * OZ_ML;
          break;
        case "shots":
          volumeMl = quantity * SHOT_ML;
          break;
        case "ml":
          volumeMl = quantity;
          break;
      }

      // Get ABV
      const drinkData = allDrinks.find(d => d.name === drink.drink);
      const abv = drink.customABV ? parseFloat(drink.customABV) : (drinkData?.abv || 0);

      // Calculate pure alcohol
      const pureAlcohol = volumeMl * (abv / 100);
      
      return total + pureAlcohol;
    }, 0);
  };

  const totalPureAlcoholNeeded = calculateTotalPureAlcoholNeeded();
  const pureAlcoholChosen = calculatePureAlcoholChosen();
  const remainingPureAlcohol = totalPureAlcoholNeeded ? totalPureAlcoholNeeded - pureAlcoholChosen : null;
  const progressPercentage = totalPureAlcoholNeeded ? (pureAlcoholChosen / totalPureAlcoholNeeded) * 100 : 0;

  const addDrink = () => {
    updateDrinks([
      ...drinks,
      { id: Date.now().toString(), category: "", drink: "", quantity: "", unit: "ml" },
    ]);
  };

  const removeDrink = (id: string) => {
    if (drinks.length > 1) {
      updateDrinks(drinks.filter((d) => d.id !== id));
    }
  };

  const resetDrink = (id: string) => {
    updateDrinks(
      drinks.map((d) =>
        d.id === id 
          ? { id: d.id, category: "", drink: "", quantity: "", unit: "ml", mixer: "" } 
          : d
      )
    );
  };

  const updateDrink = (id: string, field: keyof DrinkEntry, value: string) => {
    updateDrinks(
      drinks.map((d) =>
        d.id === id ? { ...d, [field]: value } : d
      )
    );
  };

  const selectDrink = (drinkId: string, drinkName: string) => {
    const selectedDrink = allDrinks.find(d => d.name === drinkName);
    if (selectedDrink) {
      const defaultUnit = getDefaultUnit(selectedDrink.category);
      updateDrinks(
        drinks.map((d) =>
          d.id === drinkId 
            ? { ...d, drink: drinkName, category: selectedDrink.category, unit: defaultUnit } 
            : d
        )
      );
      setOpenPopovers({ ...openPopovers, [drinkId]: false });
    }
  };

  const handleRecalculate = () => {
    recalculate();
    calculateDrinkTimeline();
    toast({
      title: "Drinks Updated! 🍻",
      description: "Your drink schedule has been recalculated!",
    });
  };

  const getDrinkABV = (drinkName: string) => {
    const drink = allDrinks.find(d => d.name === drinkName);
    return drink ? drink.abv : null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Warning for extreme buzz levels */}
      {isExtremeBuzzLevel && (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertDescription>
            ⚠️ <strong>EXTREME DANGER:</strong> Buzz levels 9 and 10 are life-threatening. This app cannot assist with drink planning or timeline creation at these levels. Please return to "Target Buzz" and select a safer level.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-4">
        {drinks.map((drink, index) => (
          <Card key={drink.id} className="p-6 space-y-4 border-primary/20 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <span className="text-2xl">🍹</span>
                Drink {index + 1}
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resetDrink(drink.id)}
                  className="hover:bg-primary/20"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                {drinks.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDrink(drink.id)}
                    className="hover:bg-destructive/20 hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Drink Search */}
              <div className="space-y-2 md:col-span-2">
                <Label>Search for a drink</Label>
                <Popover 
                  open={openPopovers[drink.id]} 
                  onOpenChange={(open) => setOpenPopovers({ ...openPopovers, [drink.id]: open })}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openPopovers[drink.id]}
                      className="w-full justify-between"
                    >
                      {drink.drink ? (
                        <span>
                          {drink.drink} 
                          <span className="text-xs text-muted-foreground ml-2">
                            ({getDrinkABV(drink.drink)}% ABV)
                          </span>
                        </span>
                      ) : (
                        "Search for a drink..."
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Type drink name (e.g., mal, beer, vodka)..." />
                      <CommandList>
                        <CommandEmpty>No drinks found.</CommandEmpty>
                        <CommandGroup>
                          {allDrinks.map((drinkOption) => (
                            <CommandItem
                              key={drinkOption.name}
                              value={drinkOption.name}
                              onSelect={() => selectDrink(drink.id, drinkOption.name)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  drink.drink === drinkOption.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span>{drinkOption.name}</span>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {drinkOption.abv}% ABV
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Custom ABV */}
              {drink.category === "custom" && (
                <div className="space-y-2">
                  <Label>Custom ABV %</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 5"
                    value={drink.customABV || ""}
                    onChange={(e) => updateDrink(drink.id, "customABV", e.target.value)}
                  />
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-2">
                <Label>Quantity</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={drink.quantity}
                    onChange={(e) => updateDrink(drink.id, "quantity", e.target.value)}
                    className="flex-1"
                  />
                  <Select
                    value={drink.unit}
                    onValueChange={(value: "ml" | "oz" | "shots" | "pints") => 
                      updateDrink(drink.id, "unit", value)
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="oz">oz</SelectItem>
                      <SelectItem value="shots">shots</SelectItem>
                      <SelectItem value="pints">pints</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mixer */}
              <div className="space-y-2 md:col-span-2">
                <Label>Mixer/Dilution (optional)</Label>
                <Input
                  placeholder="e.g., 200ml Coke, lemonade, etc."
                  value={drink.mixer || ""}
                  onChange={(e) => updateDrink(drink.id, "mixer", e.target.value)}
                />
              </div>
            </div>
          </Card>
        ))}

        <Button
          variant="outline"
          className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5"
          onClick={addDrink}
          disabled={isExtremeBuzzLevel}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Drink
        </Button>
      </div>

      {/* Pure Alcohol Progress Meter */}
      {totalPureAlcoholNeeded !== null && pureAlcoholChosen > 0 && (
        <Card className={cn(
          "p-6 space-y-4 bg-gradient-to-br transition-colors duration-500",
          progressPercentage >= 110 
            ? "from-red-500/10 to-red-600/10 border-red-500/30" 
            : "from-green-500/10 to-green-600/10 border-green-500/30"
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Battery className={cn(
              "w-5 h-5 transition-colors duration-500",
              progressPercentage >= 110 ? "text-red-600" : "text-green-600"
            )} />
            <h3 className="font-semibold text-lg">Drinks Target</h3>
          </div>
          
          {/* Battery/Tank Visual */}
          <div className="space-y-2">
            <div className={cn(
              "relative w-full h-12 bg-muted rounded-lg border-2 overflow-hidden transition-colors duration-500",
              progressPercentage >= 110 ? "border-red-600/50" : "border-green-600/50"
            )}>
              {/* Fill */}
              <div
                className={cn(
                  "absolute top-0 left-0 h-full bg-gradient-to-r transition-all duration-500 ease-out animate-fade-in",
                  progressPercentage >= 110 
                    ? "from-red-500 to-red-600" 
                    : "from-green-500 to-green-600"
                )}
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
              
              {/* Percentage Text */}
              <div className="absolute inset-0 flex items-center justify-center font-bold text-sm z-10">
                <span className={cn(
                  progressPercentage > 50 ? "text-white" : "text-foreground"
                )}>
                  {progressPercentage.toFixed(1)}%
                </span>
              </div>
              
              {/* Battery Terminal */}
              <div className={cn(
                "absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-6 rounded-r transition-colors duration-500",
                progressPercentage >= 110 ? "bg-red-600/50" : "bg-green-600/50"
              )} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-muted-foreground">Consumed</p>
                <p className={cn(
                  "font-bold transition-colors duration-500",
                  progressPercentage >= 110 ? "text-red-600" : "text-green-600"
                )}>{pureAlcoholChosen.toFixed(1)} ml</p>
              </div>
              <div>
                <p className="text-muted-foreground">Remaining</p>
                <p className={cn(
                  "font-bold",
                  remainingPureAlcohol && remainingPureAlcohol < 0 ? "text-red-500" : "text-foreground"
                )}>
                  {remainingPureAlcohol !== null ? remainingPureAlcohol.toFixed(1) : "0"} ml
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Target</p>
                <p className="font-bold">{totalPureAlcoholNeeded.toFixed(1)} ml</p>
              </div>
            </div>

            {/* Warning if over */}
            {progressPercentage > 100 && (
              <div className="text-sm text-red-500 font-medium text-center animate-fade-in">
                ⚠️ You've exceeded your target! Consider drinking water and slowing down.
              </div>
            )}

            {/* Warning if under target */}
            {progressPercentage < 97.5 && progressPercentage > 0 && (
              <div className="text-sm text-amber-600 font-medium text-center animate-fade-in">
                ℹ️ Note: Your current selection is below target. You may not reach your desired buzz level.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Critical Warning if over 125% */}
      {progressPercentage > 125 && (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertDescription>
            ⚠️ <strong>CRITICAL:</strong> Your alcohol selection exceeds 125% of your target. This is dangerous! Please go back to "Target Buzz" and decrease your buzz level or increase your timeframe.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleRecalculate}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Update Drinks
        </Button>
        <Button
          className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          onClick={onNext}
          disabled={progressPercentage > 125 || isExtremeBuzzLevel}
        >
          Next: Timeline 🕐
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default DrinksTab;
