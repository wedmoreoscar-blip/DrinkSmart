import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { DrinkFilters } from "@/components/DrinkFilterPopover";
import type { EstablishmentDrink } from "@/hooks/useEstablishments";
import { CategoryScreen } from "./CategoryScreen";
import { DrinkRow } from "./DrinkRow";
import {
  databaseVolumeMl,
  defaultServingFor,
  pureAlcoholMl,
  servingMl,
  servingOptionsFor,
  servingPrice,
} from "./picker-model";
import { pickerCategoryFor, pickerScreenCategoryFor } from "./picker-copy";

const drink = (
  id: string,
  name: string,
  abv: number | null,
  volume: number | null,
  volumeUnit = "ml",
  category = "beer",
  categoryLabel = "Beer",
): EstablishmentDrink => ({
  id,
  establishment_id: "venue-1",
  drink_name: name,
  abv,
  category,
  category_label: categoryLabel,
  price: 5,
  volume,
  volume_unit: volumeUnit,
});

describe("Wave 5 picker serving contract", () => {
  it("keeps the fixed category order, renames Spirits, and omits custom rows", () => {
    expect(pickerCategoryFor("beer_pint", "Beer (Pint)")).toBe("Beer & cider");
    expect(pickerCategoryFor("wine_red", "Red Wine")).toBe("Wine");
    expect(pickerCategoryFor("vodka", "Vodka")).toBe("Spirits");
    expect(pickerCategoryFor("cocktails", "Cocktails")).toBe("Cocktails");
    expect(pickerCategoryFor("alcopops", "Alcopops/RTD")).toBe("Soft & low-alcohol");
    expect(pickerCategoryFor("custom", "Other")).toBeNull();
  });

  it("offers the complete serving matrix and category defaults", () => {
    const beer = drink("beer", "Beer", 4, 568, "ml");
    const spirit = drink("spirit", "Gin", 40, 25, "ml", "gin", "Gin");
    const wine = drink("wine", "Wine", 12, 175, "ml", "wine_red", "Red Wine");

    expect(servingOptionsFor(beer)).toEqual([
      { id: "half", label: "Half pint", ml: 284 },
      { id: "pint", label: "Pint", ml: 568 },
      { id: "custom", label: "Custom", ml: null },
    ]);
    expect(servingOptionsFor(spirit)).toEqual([
      { id: "single", label: "Single", ml: 25 },
      { id: "double", label: "Double", ml: 50 },
      { id: "custom", label: "Custom", ml: null },
    ]);
    expect(servingOptionsFor(wine).map((option) => option.ml)).toEqual([125, 175, 250, null]);
    expect(defaultServingFor(beer).id).toBe("pint");
    expect(defaultServingFor(spirit).id).toBe("single");
    expect(defaultServingFor(wine).id).toBe("wine-175");
  });

  // A drink kept on a venue via "keep it" stores category "custom", which
  // pickerCategoryFor maps to null. One step of the quantity stepper must be one
  // of that drink's own saved serves, never the generic 330 ml standard.
  it("offers a kept custom drink its own saved serve, and defaults to it", () => {
    const kept = drink("kept", "House negroni", 24, 90, "ml", "custom", "Other");

    expect(servingOptionsFor(kept)).toEqual([
      { id: "saved", label: "90 ml", ml: 90 },
      { id: "custom", label: "Custom", ml: null },
    ]);
    expect(defaultServingFor(kept).ml).toBe(90);
    // Three taps of + are three saved serves, not three 330 ml bottles.
    expect(pureAlcoholMl(kept, defaultServingFor(kept).id, null) * 3).toBeCloseTo(64.8, 6);
    // The saved price is the price of one saved serve, so it scales 1:1.
    expect(servingPrice(kept, defaultServingFor(kept).id, null)).toBe(5);
  });

  it("falls back to the generic pair for an uncategorised row with no volume", () => {
    const unknown = drink("unknown", "Mystery", 5, null, "bottle", "custom", "Other");

    expect(servingOptionsFor(unknown)).toEqual([
      { id: "database", label: "DB volume", ml: 330 },
      { id: "standard", label: "Standard", ml: 330 },
      { id: "custom", label: "Custom", ml: null },
    ]);
    expect(defaultServingFor(unknown).id).toBe("database");
  });

  // The seeded Wetherspoons rows carry no volume and no volume_unit at all: the
  // seed migration predates both columns. This is the exact shape of the row a
  // Long Island Iced Tea arrives as, and the serving it must default to.
  it("defaults a seeded cocktail row to the cocktail fallback, not a bottle", () => {
    const seeded = drink("lit", "Long Island Iced Tea", 22, null, "", "cocktails", "Cocktails");

    expect(databaseVolumeMl(seeded)).toBeNull();
    expect(defaultServingFor(seeded).id).toBe("database");
    expect(defaultServingFor(seeded).ml).toBe(250);
    // 250 × 22% = 55 ml of ethanol, not the 72.6 that 330 ml produced.
    expect(pureAlcoholMl(seeded, defaultServingFor(seeded).id, null)).toBeCloseTo(55, 6);
  });

  it("keeps Database and Standard distinct even when both resolve to 330 ml", () => {
    const cocktail = drink("can", "Cocktail can", 5, 330, "ml", "cocktails", "Cocktails");

    expect(servingOptionsFor(cocktail)).toEqual([
      { id: "database", label: "DB volume", ml: 330 },
      { id: "standard", label: "Standard", ml: 330 },
      { id: "custom", label: "Custom", ml: null },
    ]);
  });

  it("converts database units, including fractional and half-pint servings", () => {
    expect(databaseVolumeMl(drink("pint", "Pint", 4, 1, "pint"))).toBe(568);
    expect(databaseVolumeMl(drink("fraction", "Half", 4, 0.5, "pint"))).toBe(284);
    expect(databaseVolumeMl(drink("half", "Half", 4, null, "half-pint"))).toBe(284);
    expect(databaseVolumeMl(drink("oz", "Measure", 40, 1.5, "oz"))).toBeCloseTo(44.36, 1);
    expect(databaseVolumeMl(drink("missing", "Bottle", 5, null, "bottle"))).toBeNull();
  });

  it("uses a positive custom serving and exact serving × count × ABV arithmetic", () => {
    const spirit = drink("spirit", "Gin", 40, 25, "ml", "gin", "Gin");

    expect(servingMl(spirit, "custom", null)).toBeNull();
    expect(servingMl(spirit, "custom", -1)).toBeNull();
    expect(servingMl(spirit, "custom", 35)).toBe(35);
    expect(pureAlcoholMl(spirit, "double", null) * 3).toBe(60);
    expect(pureAlcoholMl(spirit, "custom", 35) * 2).toBe(28);
  });

  it("scales prices from the database serving to the selected serving and count", () => {
    const beer = drink("beer", "Beer", 4, 568, "ml");

    expect(servingPrice(beer, "pint", null)).toBe(5);
    expect(servingPrice(beer, "half", null)).toBe(2.5);
    expect((servingPrice(beer, "half", null) ?? 0) * 3).toBe(7.5);
  });

  // Two different questions, deliberately answered by two functions: which tab a
  // venue row is selectable from, and which plan panel an entry groups under.
  it("places a kept custom row in Cocktails while keeping its plan category null", () => {
    expect(pickerScreenCategoryFor("custom", "Other")).toBe("Cocktails");
    expect(pickerScreenCategoryFor("custom", null)).toBe("Cocktails");
    expect(pickerScreenCategoryFor("", null)).toBe("Cocktails");
    expect(pickerCategoryFor("custom", "Other")).toBeNull();

    // Editorial categories are untouched by the placement rule.
    expect(pickerScreenCategoryFor("beer_pint", "Beer (Pint)")).toBe("Beer & cider");
    expect(pickerScreenCategoryFor("vodka", "Vodka")).toBe("Spirits");
  });

  it("shows a kept custom drink in the venue's Cocktails tab, at its saved serve", () => {
    const filters: DrinkFilters = {
      abvRange: { min: 0, max: 100 },
      selectedCategories: ["Cocktails"],
    };
    const html = renderToStaticMarkup(
      <CategoryScreen
        categoryLabel="Cocktails"
        availableCategories={["Cocktails"]}
        drinks={[drink("kept", "House negroni", 24, 90, "ml", "custom", "Other")]}
        filters={filters}
        onFiltersChange={() => {}}
        sort="Cheapest first"
        onSortChange={() => {}}
        selectedId="kept"
        quantity={1}
        servingId="saved"
        customMl={null}
        onSelect={() => {}}
        onQuantityChange={() => {}}
        onServingChange={() => {}}
        onCustomMlChange={() => {}}
        onBack={() => {}}
      />,
    );

    expect(html).toContain("House negroni");
    // Its own serve, and the Custom control that edits ml per entry without
    // touching the saved drink.
    expect(html).toContain("90 ml");
    expect(html).toContain("Custom");
    expect(html).not.toContain("Standard");
    expect(html).toContain("Increase quantity");
  });

  it("sorts least alcohol by the default serving volume × ABV", () => {
    const filters: DrinkFilters = {
      abvRange: { min: 0, max: 100 },
      selectedCategories: ["Cocktails"],
    };
    const html = renderToStaticMarkup(
      <CategoryScreen
        categoryLabel="Cocktails"
        availableCategories={["Cocktails"]}
        drinks={[
          drink("large-low", "Large low ABV", 4, 568, "ml", "cocktails", "Cocktails"),
          drink("small-high", "Small high ABV", 5, 250, "ml", "cocktails", "Cocktails"),
        ]}
        filters={filters}
        onFiltersChange={() => {}}
        sort="Least alcohol first"
        onSortChange={() => {}}
        selectedId={null}
        quantity={1}
        servingId=""
        customMl={null}
        onSelect={() => {}}
        onQuantityChange={() => {}}
        onServingChange={() => {}}
        onCustomMlChange={() => {}}
        onBack={() => {}}
      />,
    );

    expect(html.indexOf("Small high ABV")).toBeLessThan(html.indexOf("Large low ABV"));
  });

  it("renders every serving control beside quantity controls and treats missing ABV as zero", () => {
    const html = renderToStaticMarkup(
      <DrinkRow
        drink={drink("gap", "Unknown strength", null, null, "bottle", "unknown", "Unknown")}
        selected
        quantity={1}
        servingId="database"
        customMl={null}
        onSelect={() => {}}
        onQuantityChange={() => {}}
        onServingChange={() => {}}
        onCustomMlChange={() => {}}
      />,
    );

    expect(html).toContain("Decrease quantity");
    expect(html).toContain("Increase quantity");
    expect(html).toContain("DB volume");
    expect(html).toContain("Standard");
    expect(html).toContain("Custom");
    expect(html).toContain("—% · 330 ml · 0.0 ml ethanol");
    expect(html).not.toContain("—% · DB volume ·");
    expect(html).not.toContain("0.0% · 330 ml");
  });

  it("keeps semantic serving names in controls while subtitles show only ABV, volume and ethanol", () => {
    const spirit = drink("spirit", "Vodka", 40, 25, "ml", "vodka", "Vodka");
    const single = renderToStaticMarkup(
      <DrinkRow
        drink={spirit}
        selected
        quantity={1}
        servingId="single"
        customMl={null}
        onSelect={() => {}}
        onQuantityChange={() => {}}
        onServingChange={() => {}}
        onCustomMlChange={() => {}}
      />,
    );
    const double = renderToStaticMarkup(
      <DrinkRow
        drink={spirit}
        selected
        quantity={1}
        servingId="double"
        customMl={null}
        onSelect={() => {}}
        onQuantityChange={() => {}}
        onServingChange={() => {}}
        onCustomMlChange={() => {}}
      />,
    );

    expect(single).toContain("40.0% · 25 ml · 10 ml ethanol");
    expect(double).toContain("40.0% · 50 ml · 20 ml ethanol");
    expect(single).toContain(">Single<");
    expect(single).toContain(">Double<");
    expect(single).not.toContain("40.0% · Single");
  });
});
