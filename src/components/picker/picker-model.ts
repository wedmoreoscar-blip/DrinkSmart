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

/** The serving id a row's single, own-volume serving is offered under. */
export const SERVE_SERVING_ID = "serve";

/**
 * The serving choices per picker category.
 *
 * Beer/cider, spirits and wine have real serving ladders — half and pint,
 * single and double, 125/175/250 — where each rung is a different drink.
 *
 * Everything else has no ladder: a cocktail, a bottled soft or low-alcohol
 * drink, and a custom drink kept on the venue each come in exactly one serve.
 * That serve is the row's own volume, or its category's deterministic fallback
 * when the row carries none — 250 ml for a cocktail, 330 for a bottle. Offering
 * a second "Standard 330" beside it pretended there was a stored figure to
 * differ from, and for a cocktail it was one tap back to a bottle-sized pour.
 *
 * Custom is always available, on every category, so any serve can be typed.
 */
export function servingOptionsFor(drink: EstablishmentDrink): ServingOption[] {
  const label = pickerCategoryFor(drink.category, drink.category_label);
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
  // The seeded venue catalogue carries no volumes at all — the seed migration
  // predates the volume column — so the fallback is what most cocktail and soft
  // rows actually render. It routes through the shared deterministic table
  // rather than a literal, so the picker, the scanner and the AI catalogue
  // cannot disagree about the same missing serve.
  const ml = databaseVolumeMl(drink) ?? fallbackServeMl(drink.category, drink.category_label);
  return [{ id: SERVE_SERVING_ID, label: `${fmtMl(ml)} ml`, ml }, CUSTOM];
}

const DEFAULT_SERVING_IDS: Record<PickerCategoryLabel, string> = {
  "Beer & cider": "pint",
  Wine: "wine-175",
  Spirits: "single",
  Cocktails: SERVE_SERVING_ID,
  "Soft & low-alcohol": SERVE_SERVING_ID,
};

/**
 * The serving a drink defaults to when it is first selected or used in a swap.
 * A remembered serve is the drink's own: the row opens on Custom with the
 * user's ml pre-filled, and the least-alcohol sort and swap eligibility both
 * rank on the serve the user actually drinks.
 */
export function defaultServingFor(
  drink: EstablishmentDrink & { rememberedServingMl?: number | null },
): ServingOption {
  if (drink.rememberedServingMl != null) return CUSTOM;
  const options = servingOptionsFor(drink);
  const label = pickerCategoryFor(drink.category, drink.category_label);
  // An uncategorised row is a kept custom drink: its single serve is its own.
  const preferred = label ? DEFAULT_SERVING_IDS[label] : SERVE_SERVING_ID;
  return options.find((option) => option.id === preferred) ?? options[0];
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

/**
 * Scale the price to the selected serving volume. The user's remembered serve
 * is the volume their price is for, so it takes precedence over the row's own
 * database serving, its default rung, and the category fallback as the base
 * the scaling divides by.
 */
export function servingPrice(
  drink: EstablishmentDrink & { rememberedServingMl?: number | null },
  servingId: string,
  customMl: number | null,
): number | null {
  if (drink.price == null) return null;
  const selectedMl = servingMl(drink, servingId, customMl);
  if (selectedMl === null) return null;
  const pricedMl =
    drink.rememberedServingMl ??
    databaseVolumeMl(drink) ??
    defaultServingFor(drink).ml ??
    fallbackServeMl(drink.category, drink.category_label);
  return drink.price * (selectedMl / pricedMl);
}
