import { drinkCategories } from "@/data/drinksData";
import type { EstablishmentDrink } from "@/hooks/useEstablishments";
import { pickerCategoryFor, type PickerCategoryLabel } from "@/components/picker/picker-copy";
import { databaseVolumeMl } from "@/components/picker/picker-model";

export type DrinkUnit = "ml" | "oz" | "shots" | "pints" | "glass";

export type CatalogItem = {
  id: string;
  name: string;
  abv: number;
  typical_ml: number;
  category: string;
};

// Default serving sizes per static category. Used when neither the AI nor the
// user specifies an explicit ml override.
const CATEGORY_TYPICAL_ML: Record<string, number> = {
  beer_pint: 568,
  beer_bottle: 330,
  cocktails: 250,
  spritz: 250,
  wine_red: 175,
  wine_white: 175,
  wine_rose: 175,
  wine_sparkling: 175,
  cider: 568,
  alcopops: 275,
  gin: 25,
  vodka: 25,
  rum: 25,
  whiskey: 25,
  tequila: 25,
  liqueurs: 25,
  brandy: 25,
  shots: 25,
};

// The "natural" serving unit per category — used when converting an AI choice
// back into a DrinkEntry if the AI didn't specify a unit (it should, but be safe).
const CATEGORY_DEFAULT_UNIT: Record<string, DrinkUnit> = {
  beer_pint: "pints",
  beer_bottle: "ml",
  cocktails: "ml",
  spritz: "ml",
  wine_red: "glass",
  wine_white: "glass",
  wine_rose: "glass",
  wine_sparkling: "glass",
  cider: "pints",
  alcopops: "ml",
  gin: "shots",
  vodka: "shots",
  rum: "shots",
  whiskey: "shots",
  tequila: "shots",
  liqueurs: "shots",
  brandy: "shots",
  shots: "shots",
};

const CATALOG_ID_SEPARATOR = "::";

// Static generation-category key per picker classification. These keys drive
// preference axes, default units and icons exactly like the legacy static
// catalogue categories.
const CATEGORY_KEY_BY_PICKER_LABEL: Record<PickerCategoryLabel, string> = {
  "Beer & cider": "beer_pint",
  Wine: "wine_white",
  Spirits: "vodka",
  Cocktails: "cocktails",
  "Soft & low-alcohol": "beer_bottle",
};

export function catalogCategoryKey(drink: EstablishmentDrink): string {
  const label = pickerCategoryFor(drink.category, drink.category_label);
  return label ? CATEGORY_KEY_BY_PICKER_LABEL[label] : "cocktails";
}

/**
 * Build the generation catalogue from the active establishment's rows.
 * Ids are the stable row ids; serving volumes come from the database rows
 * (330 ml when no usable volume is stored). Custom-classified rows are
 * catalogued as cocktails.
 */
export function buildCatalogFromDrinks(drinks: EstablishmentDrink[]): CatalogItem[] {
  return drinks.map((drink) => ({
    id: drink.id,
    name: drink.drink_name,
    abv: drink.abv ?? 0,
    typical_ml: databaseVolumeMl(drink) ?? 330,
    category: catalogCategoryKey(drink),
  }));
}

export function buildStaticCatalog(): CatalogItem[] {
  return Object.entries(drinkCategories).flatMap(([categoryKey, category]) => {
    if (categoryKey === "custom") return [];
    const typicalMl = CATEGORY_TYPICAL_ML[categoryKey] ?? 250;
    return category.options.map((option) => ({
      id: `${categoryKey}${CATALOG_ID_SEPARATOR}${option.name}`,
      name: option.name,
      abv: option.abv,
      typical_ml: typicalMl,
      category: categoryKey,
    }));
  });
}

export function getCategoryDefaultUnit(category: string): DrinkUnit {
  return CATEGORY_DEFAULT_UNIT[category] ?? "ml";
}

export function parseCatalogId(id: string): { category: string; name: string } | null {
  const idx = id.indexOf(CATALOG_ID_SEPARATOR);
  if (idx === -1) return null;
  return {
    category: id.slice(0, idx),
    name: id.slice(idx + CATALOG_ID_SEPARATOR.length),
  };
}
