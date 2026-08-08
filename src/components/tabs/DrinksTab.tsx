import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VesselMeter } from "@/components/ui/vessel-meter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAppContext } from "@/contexts/AppContext";
import { ArrowRight, Plus, X, RefreshCw, Check, ChevronsUpDown, RotateCcw, Bookmark, ChevronDown, ChevronRight, Store, Clock, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { PINT_ML, OZ_ML, SHOT_ML } from "@/lib/drinkConstants";
import { getWeightInKg, getHeightInCm, getTBWGrams } from "@/lib/unitConversions";
import { useSavedDrinks } from "@/hooks/useSavedDrinks";
import { useEstablishments } from "@/hooks/useEstablishments";
import { DrinkFilterPopover, DrinkFilters } from "@/components/DrinkFilterPopover";

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
  pricePerUnit?: number | null;
  portions?: number; // Number of portions to split ml/oz drinks into
};

type FlattenedDrink = {
  name: string;
  abv: number;
  category: string;
  categoryLabel?: string;
  establishmentId?: string;
  establishmentName?: string;
  isSessionOnly?: boolean;
  price?: number | null;
  volume?: number | null;
  volumeUnit?: string | null;
};

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
  const [expandedEstablishments, setExpandedEstablishments] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  const { savedDrinks, saveDrink, isLoggedIn } = useSavedDrinks();
  const { 
    establishments, 
    getGlobalEstablishments, 
    getUserEstablishments, 
    sessionEstablishments,
    getAllSearchableDrinks,
    getEstablishmentDrinks,
  } = useEstablishments();

  // Check if buzz level is too high
  const isExtremeBuzzLevel = state.inebriationLevel >= 9;

  // Get all searchable drinks from establishments
  const establishmentDrinks = getAllSearchableDrinks();
  
  // Get global establishments (Wetherspoons)
  const globalEstablishments = getGlobalEstablishments();
  
  // Get user establishments (if logged in)
  const userEstablishments = getUserEstablishments();

  // Extract all unique categories from establishment drinks for filtering
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    establishmentDrinks.forEach((d) => {
      if (d.categoryLabel) {
        categories.add(d.categoryLabel);
      }
    });
    return Array.from(categories).sort();
  }, [establishmentDrinks]);

  // Initialize filters with all categories selected
  const [filters, setFilters] = useState<DrinkFilters>(() => ({
    abvRange: { min: 0, max: 100 },
    selectedCategories: availableCategories,
  }));

  // Update selected categories when availableCategories changes (initial load)
  useMemo(() => {
    if (filters.selectedCategories.length === 0 && availableCategories.length > 0) {
      setFilters((prev) => ({
        ...prev,
        selectedCategories: availableCategories,
      }));
    }
  }, [availableCategories]);

  // Filter function for drinks
  const filterDrink = (abv: number, categoryLabel?: string) => {
    const abvInRange = abv >= filters.abvRange.min && abv <= filters.abvRange.max;
    const categoryMatches = 
      filters.selectedCategories.length === 0 || 
      filters.selectedCategories.length === availableCategories.length ||
      (categoryLabel && filters.selectedCategories.includes(categoryLabel));
    return abvInRange && categoryMatches;
  };

  // Combine all drinks for searching
  const allDrinks: FlattenedDrink[] = establishmentDrinks.map(d => ({
    name: d.name,
    abv: d.abv,
    category: d.category,
    categoryLabel: d.categoryLabel,
    establishmentId: d.establishmentId,
    establishmentName: d.establishmentName,
    isSessionOnly: d.isSessionOnly,
  }));

  // Combine with saved custom drinks for the complete search list
  const allDrinksWithSaved: FlattenedDrink[] = [
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

  // Calculate estimated cost
  const estimatedCost = drinks.reduce((total, drink) => {
    if (drink.pricePerUnit != null && drink.quantity) {
      const qty = parseFloat(drink.quantity);
      if (!isNaN(qty)) {
        return total + drink.pricePerUnit * qty;
      }
    }
    return total;
  }, 0);
  const hasPricedDrinks = drinks.some(d => d.pricePerUnit != null);
  const hasMissingPrices = drinks.some(d => d.drink && d.pricePerUnit == null);

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

  const selectDrink = (drinkId: string, drinkName: string, abv: number, category: string, price?: number | null) => {
    const defaultUnit = getDefaultUnit(category);
    
    // If it's a saved drink, set it as custom with pre-filled values
    if (category === "saved") {
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
                customABV: abv.toString(),
                pricePerUnit: null,
              } 
            : d
        )
      );
    } else {
      updateDrinks(
        drinks.map((d) =>
          d.id === drinkId 
            ? { 
                ...d, 
                drink: drinkName, 
                category, 
                unit: defaultUnit, 
                customABV: abv.toString(),
                pricePerUnit: price ?? null,
              } 
            : d
        )
      );
    }
    setOpenPopovers({ ...openPopovers, [drinkId]: false });
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

  const toggleEstablishment = (establishmentId: string) => {
    setExpandedEstablishments(prev => ({
      ...prev,
      [establishmentId]: !prev[establishmentId],
    }));
  };

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  // Render establishment section with categorized drinks for the command list
  const renderEstablishmentSection = (establishment: { id: string; name: string; isSessionOnly?: boolean }, drinkId: string, currentDrink: DrinkEntry) => {
    const estDrinks = getEstablishmentDrinks(establishment.id);
    const isExpanded = expandedEstablishments[establishment.id] ?? false;
    
    // Group drinks by category_label and apply filters
    const drinksByCategory = estDrinks.reduce((acc, drink) => {
      // Apply filters
      if (!filterDrink(drink.abv, drink.category_label)) {
        return acc;
      }
      
      const categoryLabel = drink.category_label || "Other";
      if (!acc[categoryLabel]) {
        acc[categoryLabel] = [];
      }
      acc[categoryLabel].push(drink);
      return acc;
    }, {} as Record<string, typeof estDrinks>);

    const categoryLabels = Object.keys(drinksByCategory).sort();
    const totalFilteredDrinks = Object.values(drinksByCategory).reduce((sum, drinks) => sum + drinks.length, 0);
    
    // Don't render if no drinks match filters
    if (totalFilteredDrinks === 0) return null;
    
    return (
      <div key={establishment.id} className="border-b border-border/30 last:border-b-0">
        <button
          type="button"
          onClick={() => toggleEstablishment(establishment.id)}
          className="flex items-center justify-between w-full px-2 py-2 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{establishment.name}</span>
            {establishment.isSessionOnly && (
              <span className="text-xs bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Session
              </span>
            )}
            <span className="text-xs text-muted-foreground">({totalFilteredDrinks})</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {isExpanded && (
          <div className="pl-2 pb-2">
            {categoryLabels.map((categoryLabel) => {
              const categoryKey = `${establishment.id}-${categoryLabel}`;
              const isCategoryExpanded = expandedCategories[categoryKey] ?? false;
              const categoryDrinks = drinksByCategory[categoryLabel];
              
              return (
                <div key={categoryKey} className="border-l-2 border-border/30 ml-2">
                  <button
                    type="button"
                    onClick={() => toggleCategory(categoryKey)}
                    className="flex items-center justify-between w-full px-2 py-1.5 hover:bg-accent/30 transition-colors text-left"
                  >
                    <span className="text-sm text-muted-foreground font-medium">{categoryLabel}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">({categoryDrinks.length})</span>
                      {isCategoryExpanded ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  {isCategoryExpanded && (
                    <div className="pl-2">
                      {categoryDrinks.map((estDrink) => (
                        <CommandItem
                          key={`${establishment.id}-${estDrink.id}`}
                          value={`${establishment.name} ${categoryLabel} ${estDrink.drink_name}`}
                          onSelect={() => selectDrink(drinkId, estDrink.drink_name, estDrink.abv, estDrink.category, estDrink.price)}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              currentDrink.drink === estDrink.drink_name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span>{estDrink.drink_name}</span>
                          <span className="ml-auto text-xs text-muted-foreground flex items-center gap-2">
                            {estDrink.price != null && (
                              <span className="text-green-600">£{estDrink.price.toFixed(2)}</span>
                            )}
                            {estDrink.abv}% ABV
                          </span>
                        </CommandItem>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
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
                  <div className="flex gap-2">
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
                      <PopoverContent className="w-full p-0 max-h-[400px] overflow-y-auto" align="start">
                        <Command>
                          <CommandInput placeholder="Type drink name..." />
                          <CommandList>
                          <CommandEmpty>No drinks found.</CommandEmpty>
                          
                          {/* Saved Custom Drinks - Only for logged in users */}
                          {isLoggedIn && savedDrinks.length > 0 && (
                            <CommandGroup heading="⭐ Your Saved Drinks">
                              {savedDrinks.map((savedDrink) => (
                                <CommandItem
                                  key={`saved-${savedDrink.id}`}
                                  value={savedDrink.drink_name}
                                  onSelect={() => selectDrink(drink.id, savedDrink.drink_name, savedDrink.abv, "saved")}
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
                          
                          {/* User's Saved Establishments - Only for logged in users */}
                          {isLoggedIn && userEstablishments.length > 0 && (
                            <CommandGroup heading="🏪 Your Establishments">
                              {userEstablishments.map((est) => renderEstablishmentSection(est, drink.id, drink))}
                            </CommandGroup>
                          )}
                          
                          {/* Session Establishments - For guests who uploaded menus this session */}
                          {!isLoggedIn && sessionEstablishments.length > 0 && (
                            <CommandGroup heading="🏪 Your Establishments (Session)">
                              {sessionEstablishments.map((est) => renderEstablishmentSection({ ...est, isSessionOnly: true }, drink.id, drink))}
                            </CommandGroup>
                          )}
                          
                          {/* Wetherspoons - Global establishment, always visible */}
                          {globalEstablishments.length > 0 && (
                            <CommandGroup heading="🍺 Wetherspoons">
                              {globalEstablishments.map((est) => renderEstablishmentSection(est, drink.id, drink))}
                            </CommandGroup>
                          )}
                          
                          {/* Fallback if no establishments loaded yet */}
                          {establishments.length === 0 && (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                              Loading drinks...
                            </div>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <DrinkFilterPopover
                    filters={filters}
                    onFiltersChange={setFilters}
                    availableCategories={availableCategories}
                  />
                  </div>
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
                    onValueChange={(value: "ml" | "oz" | "shots" | "pints" | "glass") => {
                      updateDrink(drink.id, "unit", value);
                      // Reset portions when switching away from ml/oz
                      if (value !== "ml" && value !== "oz") {
                        updateDrinks(
                          drinks.map((d) =>
                            d.id === drink.id ? { ...d, unit: value, portions: undefined } : d
                          )
                        );
                      }
                    }}
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
                
                {/* Portions input - only for ml/oz units */}
                {(drink.unit === "ml" || drink.unit === "oz") && drink.quantity && parseFloat(drink.quantity) > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">Split into portions?</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {drink.portions && drink.portions > 1 
                            ? `${drink.portions} × ${Math.round(parseFloat(drink.quantity) / drink.portions)}${drink.unit} each`
                            : "Drink will appear as one timeline entry"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          placeholder="1"
                          value={drink.portions || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const numVal = parseInt(val);
                            updateDrinks(
                              drinks.map((d) =>
                                d.id === drink.id 
                                  ? { ...d, portions: val === "" ? undefined : (isNaN(numVal) || numVal < 1 ? 1 : numVal) } 
                                  : d
                              )
                            );
                          }}
                          className="w-20 text-center"
                        />
                        <span className="text-sm text-muted-foreground">portions</span>
                      </div>
                    </div>
                  </div>
                )}
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

      {/* Guest login prompt */}
      {!isLoggedIn && (
        <Alert className="border-primary/30 bg-primary/5">
          <AlertDescription className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" />
            <span>Log in to save custom drinks and establishments for future sessions.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Estimated Cost Card */}
      {hasPricedDrinks && estimatedCost > 0 && (
        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="font-semibold">Estimated Cost</span>
            </div>
            <span className="text-2xl font-bold text-green-600">£{estimatedCost.toFixed(2)}</span>
          </div>
          {hasMissingPrices && (
            <p className="text-xs text-muted-foreground mt-2">
              ⓘ Some drinks don't have price data
            </p>
          )}
        </Card>
      )}

      {/* Pure Alcohol Vessel Meter */}
      {totalPureAlcoholNeeded !== null && pureAlcoholChosen > 0 && (
        <Card className="p-6">
          <VesselMeter
            targetMl={totalPureAlcoholNeeded}
            entries={drinks.reduce<{ label: string; ml: number }[]>((entries, drink) => {
              if (!drink.quantity) return entries;
              if (!drink.isCustom && !drink.drink) return entries;
              if (drink.isCustom && (!drink.customName || !drink.customABV)) return entries;

              const quantity = parseFloat(drink.quantity);
              if (isNaN(quantity)) return entries;

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
                  volumeMl = quantity * 175;
                  break;
                case "ml":
                  volumeMl = quantity;
                  break;
              }

              let abv = 0;
              if (drink.isCustom) {
                abv = parseFloat(drink.customABV || "0");
              } else {
                const drinkData = allDrinks.find((d) => d.name === drink.drink);
                abv = drinkData?.abv || 0;
              }

              const count = quantity.toString();
              let label = drink.isCustom ? drink.customName || drink.drink : drink.drink;
              if (drink.unit === "pints") label = quantity === 1 ? "pint" : `${count} pints`;
              if (drink.unit === "shots") label = quantity === 1 ? "shot" : `${count} shots`;
              if (drink.unit === "glass") label = quantity === 1 ? "glass" : `${count} glasses`;
              if (drink.unit === "oz") label = quantity === 1 ? "oz" : `${count} oz`;

              entries.push({ label, ml: volumeMl * (abv / 100) });
              return entries;
            }, [])}
          />
        </Card>
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
