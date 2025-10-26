import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useAppContext } from "@/contexts/AppContext";
import { ArrowRight, Plus, X, RefreshCw, Check, ChevronsUpDown, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { drinkCategories } from "@/data/drinksData";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  const { state, updateDrinks, recalculate } = useAppContext();
  const drinks = state.drinks;
  const { toast } = useToast();
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

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
    toast({
      title: "Drinks Updated! 🍻",
      description: "Your drink list has been saved. Let's see where the night takes you!",
    });
  };

  const getDrinkABV = (drinkName: string) => {
    const drink = allDrinks.find(d => d.name === drinkName);
    return drink ? drink.abv : null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Drink
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleRecalculate}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Recalculate
        </Button>
        <Button
          className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          onClick={onNext}
        >
          Next: Timeline 🕐
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default DrinksTab;
