import { PINT_ML, OZ_ML, SHOT_ML } from "@/lib/drinkConstants";
import type { EstablishmentDrink } from "@/hooks/useEstablishments";

export type Portion = "half" | "pint";

const volumeUnit = (drink: EstablishmentDrink): string => (drink.volume_unit ?? "").toLowerCase();

export const isPintDrink = (drink: EstablishmentDrink): boolean => {
  const unit = volumeUnit(drink);
  if (unit.includes("pint")) return true;
  return (
    unit === "" &&
    (drink.category.toLowerCase().includes("beer") ||
      drink.category.toLowerCase().includes("cider"))
  );
};

export const perUnitVolumeMl = (drink: EstablishmentDrink, portion: Portion): number => {
  const unit = volumeUnit(drink);
  if (unit.includes("pint")) return PINT_ML * (portion === "half" ? 0.5 : 1);
  if (unit.includes("glass")) return 175;
  if (unit.includes("shot")) return SHOT_ML;
  if (unit.includes("oz")) return (drink.volume ?? 1.5) * OZ_ML;
  return drink.volume ?? 330;
};

export const pureAlcoholMl = (drink: EstablishmentDrink, portion: Portion = "pint"): number =>
  (perUnitVolumeMl(drink, portion) * (drink.abv ?? 0)) / 100;

export const portionWord = (drink: EstablishmentDrink, portion: Portion): string => {
  const unit = volumeUnit(drink);
  if (unit.includes("pint")) return portion;
  if (unit.includes("glass")) return "glass";
  if (unit.includes("shot")) return "shot";
  if (unit.includes("oz")) return `${drink.volume ?? 1.5} oz`;
  return `${drink.volume ?? 330} ml`;
};

export const entryUnit = (drink: EstablishmentDrink): "ml" | "oz" | "shots" | "pints" | "glass" => {
  const unit = volumeUnit(drink);
  if (unit.includes("pint")) return "pints";
  if (unit.includes("glass")) return "glass";
  if (unit.includes("shot")) return "shots";
  if (unit.includes("oz")) return "oz";
  return "ml";
};

export const entryQuantity = (
  drink: EstablishmentDrink,
  quantity: number,
  portion: Portion,
): string => {
  const unit = volumeUnit(drink);
  if (unit.includes("pint")) return String(quantity * (portion === "half" ? 0.5 : 1));
  if (unit.includes("glass")) return String(quantity);
  if (unit.includes("shot")) return String(quantity);
  if (unit.includes("oz")) return String(quantity * (drink.volume ?? 1.5));
  return String(quantity * (drink.volume ?? 330));
};
