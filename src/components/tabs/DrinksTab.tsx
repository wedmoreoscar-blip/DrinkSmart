import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/contexts/AppContext";
import { ArrowRight, Plus, X, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { drinkCategories } from "@/data/drinksData";

type DrinkEntry = {
  id: string;
  category: string;
  drink: string;
  customABV?: string;
  quantity: string;
  unit: "ml" | "oz" | "shots" | "pints";
  mixer?: string;
};

const DrinksTab = ({ onNext }: { onNext: () => void }) => {
  const { state, updateDrinks, recalculate } = useAppContext();
  const drinks = state.drinks;
  const { toast } = useToast();

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

  const updateDrink = (id: string, field: keyof DrinkEntry, value: string) => {
    updateDrinks(
      drinks.map((d) =>
        d.id === id ? { ...d, [field]: value } : d
      )
    );
  };

  const handleRecalculate = () => {
    recalculate();
    toast({
      title: "Drinks Updated! 🍻",
      description: "Your drink list has been saved. Let's see where the night takes you!",
    });
  };

  const getCategoryLabel = (categoryKey: string) => {
    return drinkCategories[categoryKey]?.label || "Select category";
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

            <div className="grid md:grid-cols-2 gap-4">
              {/* Category Selection */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={drink.category}
                  onValueChange={(value) => {
                    updateDrink(drink.id, "category", value);
                    updateDrink(drink.id, "drink", "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category">
                      {drink.category ? getCategoryLabel(drink.category) : "Select category"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {Object.entries(drinkCategories).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Drink Selection */}
              <div className="space-y-2">
                <Label>Drink</Label>
                <Select
                  value={drink.drink}
                  onValueChange={(value) => updateDrink(drink.id, "drink", value)}
                  disabled={!drink.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select drink" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {drink.category &&
                      drinkCategories[drink.category as keyof typeof drinkCategories].options.map(
                        (option) => (
                          <SelectItem key={option.name} value={option.name}>
                            {option.name} ({option.abv}% ABV)
                          </SelectItem>
                        )
                      )}
                  </SelectContent>
                </Select>
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
                    <SelectContent>
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
