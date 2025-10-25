import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";

type DrinkEntry = {
  id: string;
  category: string;
  drink: string;
  customABV?: string;
  quantity: string;
  unit: "ml" | "oz";
  mixer?: string;
};

const drinkCategories = {
  beer: {
    label: "Beer",
    options: [
      { name: "Light Beer", abv: 4 },
      { name: "Regular Beer", abv: 5 },
      { name: "IPA", abv: 6.5 },
      { name: "Strong Beer", abv: 8 },
    ],
  },
  wine: {
    label: "Wine",
    options: [
      { name: "White Wine", abv: 12 },
      { name: "Red Wine", abv: 13 },
      { name: "Prosecco", abv: 11 },
      { name: "Port", abv: 20 },
    ],
  },
  spirits: {
    label: "Spirits",
    options: [
      { name: "Vodka", abv: 40 },
      { name: "Whiskey", abv: 40 },
      { name: "Rum", abv: 40 },
      { name: "Gin", abv: 40 },
      { name: "Tequila", abv: 40 },
    ],
  },
  cocktails: {
    label: "Cocktails",
    options: [
      { name: "Margarita", abv: 15 },
      { name: "Mojito", abv: 13 },
      { name: "Old Fashioned", abv: 32 },
      { name: "Martini", abv: 28 },
      { name: "Cosmopolitan", abv: 22 },
    ],
  },
  custom: {
    label: "Custom",
    options: [{ name: "Custom Drink", abv: 0 }],
  },
};

const Drinks = () => {
  const navigate = useNavigate();
  const [drinks, setDrinks] = useState<DrinkEntry[]>([
    { id: "1", category: "", drink: "", quantity: "", unit: "ml" },
  ]);

  const addDrink = () => {
    setDrinks([
      ...drinks,
      { id: Date.now().toString(), category: "", drink: "", quantity: "", unit: "ml" },
    ]);
  };

  const removeDrink = (id: string) => {
    if (drinks.length > 1) {
      setDrinks(drinks.filter((d) => d.id !== id));
    }
  };

  const updateDrink = (id: string, field: keyof DrinkEntry, value: string) => {
    setDrinks(
      drinks.map((d) =>
        d.id === id ? { ...d, [field]: value } : d
      )
    );
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">What Are You Drinking?</h1>
          <p className="text-muted-foreground">
            Add all the drinks you plan to consume
          </p>
        </div>

        <div className="space-y-4">
          {drinks.map((drink, index) => (
            <Card key={drink.id} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Drink {index + 1}</h3>
                {drinks.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDrink(drink.id)}
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
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
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
                    <SelectContent>
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
                      onValueChange={(value: "ml" | "oz") => updateDrink(drink.id, "unit", value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Mixer */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Mixer/Dilution (optional)</Label>
                  <Input
                    placeholder="e.g., 200ml Coke"
                    value={drink.mixer || ""}
                    onChange={(e) => updateDrink(drink.id, "mixer", e.target.value)}
                  />
                </div>
              </div>
            </Card>
          ))}

          <Button
            variant="outline"
            className="w-full"
            onClick={addDrink}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Drink
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/inebriation")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={() => navigate("/timeline")}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Drinks;
