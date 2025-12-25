import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppContext } from "@/contexts/AppContext";
import { ArrowRight, Plus, X, RefreshCw, Check, ChevronsUpDown, RotateCcw, Battery, Bookmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { drinkCategories } from "@/data/drinksData";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { PINT_ML, OZ_ML, SHOT_ML } from "@/lib/drinkConstants";
import { getWeightInKg, getHeightInCm, getTBWGrams } from "@/lib/unitConversions";
import { useSavedDrinks } from "@/hooks/useSavedDrinks";

type DrinkEntry = {
  id: string;
  category: string;
  drink: string;
  customABV?: string;
  quantity: string;
  unit: "ml" | "oz" | "shots" | "pints" | "glass";
  mixer?: string;
  mixerQuantity?: string;
  mixerUnit?: "ml" | "oz" | "shots" | "pints" | "glass";
  isCustom?: boolean;
  customName?: string;
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
const getDefaultUnit = (category: string): "ml" | "oz" | "shots" | "pints" | "glass" => {
  if (category.includes("beer") || category.includes("cider")) return "pints";
  if (category.includes("wine")) return "glass";
  if (category === "shots") return "shots";
  return "ml";
};

const DrinksTab = ({ onNext }: { onNext: () => void }) => {
  const { state, updateDrinks, recalculate, calculateDrinkTimeline } = useAppContext();
  const drinks = state.drinks;
  const { toast } = useToast();
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});
  const [saveDrinkCheckboxes, setSaveDrinkCheckboxes] = useState<Record<string, boolean>>({});
  const [filledFromSaved, setFilledFromSaved] = useState<Record<string, boolean>>({});
  const { savedDrinks, saveDrink, isLoggedIn } = useSavedDrinks();

  // Check if buzz level is too high
  const isExtremeBuzzLevel = state.inebriationLevel >= 9;

  // Combine establishment drinks with saved custom drinks for search
  const allDrinksWithSaved = [
    ...allDrinks,
    ...savedDrinks.map(sd => ({
      name: sd.drink_name,
      abv: sd.abv,
      category: "saved",
    })),
  ];

  // Calculate total pure alcohol needed using Watson TBW formula (matching ResultsTab)
  const calculateTotalPureAlcoholNeeded = () => {
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

    return pureAlcoholMl;
  };

  // Calculate pure alcohol from drinks
  const calculatePureAlcoholChosen = () => {
    return drinks.reduce((total, drink) => {
      if (!drink.quantity) return total;
      if (!drink.isCustom && !drink.drink) return total;
      if (drink.isCustom && (!drink.customName || !drink.customABV)) return total;

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
        case "glass":
          volumeMl = quantity * 175; // GLASS_ML
          break;
        case "ml":
          volumeMl = quantity;
          break;
      }

      // Get ABV
      let abv = 0;
      if (drink.isCustom) {
        abv = parseFloat(drink.customABV || "0");
      } else {
        const drinkData = allDrinks.find(d => d.name === drink.drink);
        abv = drinkData?.abv || 0;
      }

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
      { id: Date.now().toString(), category: "", drink: "", quantity: "", unit: "ml", isCustom: false },
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
          ? { id: d.id, category: "", drink: "", quantity: "", unit: "ml", mixer: "", isCustom: false, customName: "", customABV: "" } 
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
    const selectedDrink = allDrinksWithSaved.find(d => d.name === drinkName);
    if (selectedDrink) {
      const defaultUnit = getDefaultUnit(selectedDrink.category);
      // If it's a saved drink, set it as custom with pre-filled values
      if (selectedDrink.category === "saved") {
        updateDrinks(
          drinks.map((d) =>
            d.id === drinkId 
              ? { 
                  ...d, 
                  drink: "", 
                  category: "saved",
                  unit: defaultUnit,
                  isCustom: true,
                  customName: drinkName,
                  customABV: selectedDrink.abv.toString(),
                } 
              : d
          )
        );
      } else {
        updateDrinks(
          drinks.map((d) =>
            d.id === drinkId 
              ? { ...d, drink: drinkName, category: selectedDrink.category, unit: defaultUnit } 
              : d
          )
        );
      }
      setOpenPopovers({ ...openPopovers, [drinkId]: false });
    }
  };

  const handleRecalculate = () => {
    recalculate();
    calculateDrinkTimeline();
    toast({
      title: "Drinks Updated! 🍻",
      description: "Your drink schedule has been recalculated!",
      duration: 3000,
    });
  };

  const getDrinkABV = (drinkName: string) => {
    const drink = allDrinksWithSaved.find(d => d.name === drinkName);
    return drink ? drink.abv : null;
  };

  const toggleCustomMode = (id: string) => {
    updateDrinks(
      drinks.map((d) =>
        d.id === id 
          ? { ...d, isCustom: !d.isCustom, drink: "", customName: "", customABV: "", category: "" } 
          : d
      )
    );
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
              {/* Drink Selection Mode Toggle */}
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <Label>{drink.isCustom ? "Custom Drink" : "Search for a drink"}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCustomMode(drink.id)}
                    className="text-xs h-7"
                  >
                    {drink.isCustom ? "Switch to Search" : "Create Custom"}
                  </Button>
                </div>

                {!drink.isCustom ? (
                  /* Drink Search */
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
                          {/* Saved Drinks Group */}
                          {savedDrinks.length > 0 && (
                            <CommandGroup heading="⭐ Your Saved Drinks">
                              {savedDrinks.map((savedDrink) => (
                                <CommandItem
                                  key={`saved-${savedDrink.id}`}
                                  value={savedDrink.drink_name}
                                  onSelect={() => selectDrink(drink.id, savedDrink.drink_name)}
                                >
                                  <Bookmark className="mr-2 h-4 w-4 text-primary" />
                                  <span>{savedDrink.drink_name}</span>
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {savedDrink.abv}% ABV
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          <CommandGroup heading="Establishment Drinks">
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
                ) : (
                  /* Custom Drink Inputs */
                  <div className="space-y-4">
                    {/* Select from saved drinks */}
                    {isLoggedIn && savedDrinks.length > 0 && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Bookmark className="h-4 w-4 text-primary" />
                          Select from saved drinks
                        </Label>
                        <Select
                          value=""
                          onValueChange={(drinkId) => {
                            const selected = savedDrinks.find(d => d.id === drinkId);
                            if (selected) {
                              updateDrinks(
                                drinks.map((d) =>
                                  d.id === drink.id 
                                    ? { ...d, customName: selected.drink_name, customABV: selected.abv.toString() } 
                                    : d
                                )
                              );
                              setFilledFromSaved(prev => ({ ...prev, [drink.id]: true }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a saved drink..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            {savedDrinks.map((savedDrink) => (
                              <SelectItem key={savedDrink.id} value={savedDrink.id}>
                                {savedDrink.drink_name} ({savedDrink.abv}% ABV)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Drink Name</Label>
                        <Input
                          type="text"
                          placeholder="e.g., My Special Cocktail"
                          value={drink.customName || ""}
                          onChange={(e) => {
                            updateDrink(drink.id, "customName", e.target.value);
                            setFilledFromSaved(prev => ({ ...prev, [drink.id]: false }));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ABV %</Label>
                        <Input
                          type="number"
                          placeholder="e.g., 5"
                          value={drink.customABV || ""}
                          onChange={(e) => {
                            updateDrink(drink.id, "customABV", e.target.value);
                            setFilledFromSaved(prev => ({ ...prev, [drink.id]: false }));
                          }}
                        />
                      </div>
                    </div>
                    {/* Save drink checkbox */}
                    {isLoggedIn && drink.customName && drink.customABV && !filledFromSaved[drink.id] && (
                      <div className="flex items-center space-x-2 pt-2 border-t border-border/50">
                        <Checkbox
                          id={`save-drink-${drink.id}`}
                          checked={saveDrinkCheckboxes[drink.id] || false}
                          onCheckedChange={(checked) => {
                            setSaveDrinkCheckboxes(prev => ({ ...prev, [drink.id]: !!checked }));
                            if (checked && drink.customName && drink.customABV) {
                              saveDrink(drink.customName, parseFloat(drink.customABV));
                            }
                          }}
                        />
                        <Label 
                          htmlFor={`save-drink-${drink.id}`} 
                          className="text-sm font-normal cursor-pointer flex items-center gap-2"
                        >
                          <Bookmark className="h-4 w-4" />
                          Save this drink to my account
                        </Label>
                      </div>
                    )}
                    {!isLoggedIn && drink.customName && drink.customABV && (
                      <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                        Sign in to save custom drinks for future use
                      </p>
                    )}
                  </div>
                )}
              </div>

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
                    onValueChange={(value: "ml" | "oz" | "shots" | "pints" | "glass") => 
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
                      <SelectItem value="glass">glass</SelectItem>
                      <SelectItem value="pints">pints</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mixer */}
              <div className="space-y-2">
                <Label>Mixer/Dilution (optional)</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="e.g., Coke, lemonade, tonic water"
                    value={drink.mixer || ""}
                    onChange={(e) => updateDrink(drink.id, "mixer", e.target.value)}
                  />
                  {drink.mixer && (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={drink.mixerQuantity || ""}
                        onChange={(e) => updateDrink(drink.id, "mixerQuantity", e.target.value)}
                        className="flex-1"
                      />
                      <Select
                        value={drink.mixerUnit || "ml"}
                        onValueChange={(value: "ml" | "oz" | "shots" | "pints" | "glass") => 
                          updateDrink(drink.id, "mixerUnit", value)
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="oz">oz</SelectItem>
                          <SelectItem value="shots">shots</SelectItem>
                          <SelectItem value="glass">glass</SelectItem>
                          <SelectItem value="pints">pints</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
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

      {/* Adjustment Info */}
      {progressPercentage > 100 && progressPercentage <= 120 && state.adjustedTargetMl && (
        <Alert className="animate-fade-in border-blue-500/30 bg-blue-500/10">
          <AlertDescription>
            ℹ️ <strong>Timeline Auto-Adjusted:</strong> Your drinks will be distributed based on {state.adjustedTargetMl.toFixed(1)}ml 
            (your actual selection) rather than the original {totalPureAlcoholNeeded?.toFixed(1)}ml target, ensuring all drinks fit within your timeframe.
          </AlertDescription>
        </Alert>
      )}

      {/* Critical Warning if over 120% */}
      {progressPercentage > 120 && (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertDescription>
            ⚠️ <strong>CRITICAL:</strong> Your alcohol selection exceeds 120% of your target. Please either increase your desired buzz level or increase your timeframe.
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
          disabled={progressPercentage > 120 || isExtremeBuzzLevel}
        >
          Next: Timeline 🕐
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default DrinksTab;
