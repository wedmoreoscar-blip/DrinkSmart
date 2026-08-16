import { OZ_ML, PINT_ML, SHOT_ML } from "@/lib/drinkConstants";
import { fallbackServeMl } from "@/lib/drinkFallbacks";
import type { EstablishmentDrink } from "@/hooks/useEstablishments";
import { fmtMl, pickerCategoryFor, type PickerCategoryLabel } from "./picker-copy";

/**
 * One selectable serving for a venue drink. `ml` is the fixed serving volume;
 * the Custom option has `ml: null` and takes its volume from the user-entered
 * custom ml amount of the pending selection.
 */
export type ServingOption = {
  id: string;
  label: string;
  ml: number | null;
};

const volumeUnit = (drink: EstablishmentDrink): string => (drink.volume_unit ?? "").toLowerCase();

/**
 * The row's own database serving in ml, derived from `volume`/`volume_unit`.
 * Returns null when no usable volume can be derived.
 */
export function databaseVolumeMl(drink: EstablishmentDrink): number | null {
  const unit = volumeUnit(drink);
  const volume =
    drink.volume != null && Number.isFinite(drink.volume) && drink.volume > 0
      ? drink.volume
      : null;
  if (/half[ -]?pint/.test(unit)) return (volume ?? 1) * (PINT_ML / 2);
  if (unit.includes("pint")) return (volume ?? 1) * PINT_ML;
  if (unit.includes("oz")) return (volume ?? 1.5) * OZ_ML;
  if (unit.includes("glass")) return volume !== null && volume > 10 ? volume : (volume ?? 1) * 175;
  if (unit.includes("shot")) return volume !== null && volume > 10 ? volume : (volume ?? 1) * SHOT_ML;
  if (volume !== null) return volume;
  return null;
}

const CUSTOM: ServingOption = { id: "custom", label: "Custom", ml: null };

/** The serving id a custom row's own saved volume is offered under. */
export const SAVED_SERVING_ID = "saved";

/**
 * The serving choices per picker category. Beer/cider offer half pint and
 * pint; spirits offer single and double; wine offers 125/175/250 ml; every
 * other row (cocktails, bottled low/no/soft) offers the database volume and the
 * standard 330 ml bottle as separate choices, even when their numeric values
 * happen to match.
 *
 * A row with no picker category is a drink the user added themselves and kept
 * on the venue. Its serve is the one they saved with it, so that — and not a
 * category default — is the only fixed choice: one step of the quantity
 * stepper is then exactly one saved serve. Such a row carrying no usable
 * volume falls back to the generic pair.
 */
export function servingOptionsFor(drink: EstablishmentDrink): ServingOption[] {
  const label = pickerCategoryFor(drink.category, drink.category_label);
  if (label === null) {
    const savedMl = databaseVolumeMl(drink);
    if (savedMl != null) {
      return [{ id: SAVED_SERVING_ID, label: `${fmtMl(savedMl)} ml`, ml: savedMl }, CUSTOM];
    }
  }
  if (label === "Beer & cider") {
    return [
      { id: "half", label: "Half pint", ml: PINT_ML / 2 },
      { id: "pint", label: "Pint", ml: PINT_ML },
      CUSTOM,
    ];
  }
  if (label === "Spirits") {
    return [
      { id: "single", label: "Single", ml: 25 },
      { id: "double", label: "Double", ml: 50 },
      CUSTOM,
    ];
  }
  if (label === "Wine") {
    return [
      { id: "wine-125", label: "125 ml", ml: 125 },
      { id: "wine-175", label: "175 ml", ml: 175 },
      { id: "wine-250", label: "250 ml", ml: 250 },
      CUSTOM,
    ];
  }
  return [
    // The seeded venue catalogue carries no volumes at all — the seed migration
    // predates the volume column — so this fallback is what most cocktail and
    // soft rows actually render. It routes through the shared deterministic
    // table rather than a literal, so the picker, the scanner and the AI
    // catalogue cannot disagree about the same missing serve.
    {
      id: "database",
      label: "DB volume",
      ml: databaseVolumeMl(drink) ?? fallbackServeMl(drink.category, drink.category_label),
    },
    { id: "standard", label: "Standard", ml: 330 },
    CUSTOM,
  ];
}

const DEFAULT_SERVING_IDS: Record<PickerCategoryLabel, string> = {
  "Beer & cider": "pint",
  Wine: "wine-175",
  Spirits: "single",
  Cocktails: "database",
  "Soft & low-alcohol": "database",
};

/** The serving a drink defaults to when it is first selected or used in a swap. */
export function defaultServingFor(drink: EstablishmentDrink): ServingOption {
  const options = servingOptionsFor(drink);
  const label = pickerCategoryFor(drink.category, drink.category_label);
  // An uncategorised row defaults to its own saved serve; if it has none, the
  // generic options are in play and "database" is the right preference again.
  const preferred = label ? DEFAULT_SERVING_IDS[label] : SAVED_SERVING_ID;
  return (
    options.find((option) => option.id === preferred) ??
    options.find((option) => option.id === "database") ??
    options[0]
  );
}

export function servingOptionFor(drink: EstablishmentDrink, servingId: string): ServingOption | null {
  return servingOptionsFor(drink).find((option) => option.id === servingId) ?? null;
}

/**
 * The serving volume in ml for the pending selection. A Custom serving is
 * valid only when the custom amount is a positive finite number; anything
 * else yields null (no commitable serving).
 */
export function servingMl(
  drink: EstablishmentDrink,
  servingId: string,
  customMl: number | null
): number | null {
  const option = servingOptionFor(drink, servingId);
  if (!option) return null;
  if (option.ml != null) return option.ml;
  if (customMl != null && Number.isFinite(customMl) && customMl > 0) return customMl;
  return null;
}

/**
 * Pure ethanol of one serving: servingMl × ABV / 100. Zero when the serving
 * is not commitable.
 */
export function pureAlcoholMl(
  drink: EstablishmentDrink,
  servingId: string,
  customMl: number | null
): number {
  const ml = servingMl(drink, servingId, customMl);
  return ml == null ? 0 : (ml * (drink.abv ?? 0)) / 100;
}

/** Scale the database price to the selected serving volume. */
export function servingPrice(
  drink: EstablishmentDrink,
  servingId: string,
  customMl: number | null,
): number | null {
  if (drink.price == null) return null;
  const selectedMl = servingMl(drink, servingId, customMl);
  if (selectedMl === null) return null;
  const pricedMl =
    databaseVolumeMl(drink) ??
    defaultServingFor(drink).ml ??
    fallbackServeMl(drink.category, drink.category_label);
  return drink.price * (selectedMl / pricedMl);
}
