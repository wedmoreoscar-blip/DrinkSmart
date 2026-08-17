import { drinkCategories } from "@/data/drinksData";
import type { Establishment, EstablishmentDrink } from "@/hooks/useEstablishments";
import { pickerCategoryFor, type PickerCategoryLabel } from "@/components/picker/picker-copy";
import { databaseVolumeMl, rungsFor } from "@/components/picker/picker-model";
import { resolvePrice } from "@/lib/basePricing";
import { fallbackAbv, fallbackServeMl } from "@/lib/drinkFallbacks";

export type DrinkUnit = "ml" | "oz" | "shots" | "pints" | "glass";

export type CatalogItem = {
  id: string;
  name: string;
  abv: number;
  typical_ml: number;
  category: string;
  /** Price of one typical serving, in pounds. Absent when unknown. */
  price?: number | null;
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
 * Ids are the stable row ids; serving volumes come from the database rows.
 * Legacy rows stored without ABV or volume get the same deterministic
 * fallbacks the scanner review shows, so AI generation agrees with the manual
 * picker's serving assumptions for that category.
 */
export function buildCatalogFromDrinks(drinks: EstablishmentDrink[]): CatalogItem[] {
  return drinks.map((drink) => {
    const typicalMl =
      databaseVolumeMl(drink) ?? fallbackServeMl(drink.category, drink.category_label);
    return {
      id: drink.id,
      name: drink.drink_name,
      abv: drink.abv ?? fallbackAbv(drink.category, drink.category_label),
      typical_ml: typicalMl,
      category: catalogCategoryKey(drink),
      // The price of ONE typical serving, resolved from this drink's rungs —
      // which is where a user's own prices live. Reading `drink.price` alone
      // showed the model the catalogue figure and never the user's, so a fully
      // priced venue still reached the model with an empty price column.
      price: (() => {
        const resolved = resolvePrice(typicalMl, rungsFor(drink));
        return resolved.status === "priced" ? resolved.total : null;
      })(),
    };
  });
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
      price: null,
    }));
  });
}

export function buildActiveVenueCatalog(
  activeVenue: Establishment | null,
  drinks: EstablishmentDrink[],
): CatalogItem[] {
  if (!activeVenue) return [];
  const activeRows = drinks.filter((drink) => drink.establishment_id === activeVenue.id);
  if (activeRows.length > 0) return buildCatalogFromDrinks(activeRows);
  return activeVenue.isGlobal && activeVenue.name === "Wetherspoons"
    ? buildStaticCatalog()
    : [];
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
