import { OZ_ML, PINT_ML, SHOT_ML } from "@/lib/drinkConstants";
import {
  resolvePrice,
  sameVolumeMl,
  type PriceResolution,
  type PricedRung,
} from "@/lib/basePricing";
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
  drink: EstablishmentDrink & { rememberedServingMl?: number | null },
  servingId: string,
  customMl: number | null
): number | null {
  const option = servingOptionFor(drink, servingId);
  if (!option) return null;
  if (option.ml != null) return option.ml;
  if (customMl != null && Number.isFinite(customMl) && customMl > 0) return customMl;
  // A Custom serving with no typed amount resolves to the user's remembered
  // serve. Without this, `defaultServingFor` returning Custom for a remembered
  // drink makes every such drink measure zero ethanol in the `Least alcohol
  // first` sort and in swap eligibility — ranking it as the weakest drink on
  // the screen regardless of how much the user actually pours.
  if (drink.rememberedServingMl != null) return drink.rememberedServingMl;
  return null;
}

/**
 * Pure ethanol of one serving: servingMl × ABV / 100. Zero when the serving
 * is not commitable.
 */
export function pureAlcoholMl(
  drink: EstablishmentDrink & { rememberedServingMl?: number | null },
  servingId: string,
  customMl: number | null
): number {
  const ml = servingMl(drink, servingId, customMl);
  return ml == null ? 0 : (ml * (drink.abv ?? 0)) / 100;
}

/**
 * Every priced volume this drink has, as rungs.
 *
 * Two sources, user first. The catalogue row contributes one rung — its own
 * `price` at its own volume — and the user's priced volumes contribute the
 * rest, overriding the catalogue rung when they name the same volume.
 *
 * The catalogue rung is composed here rather than in `drinkOverrides.ts`
 * because turning `volume`/`volume_unit` into millilitres is picker knowledge;
 * the resolver is pure and deliberately does not carry it.
 */
export function rungsFor(
  drink: EstablishmentDrink & {
    rememberedServingMl?: number | null;
    userPricedRungs?: PricedRung[];
  },
): PricedRung[] {
  const rungs: PricedRung[] = [];

  const catalogueVolume = databaseVolumeMl(drink);
  if (drink.price != null && drink.price >= 0 && catalogueVolume != null && catalogueVolume > 0) {
    rungs.push({ volumeMl: catalogueVolume, price: drink.price });
  }

  for (const rung of drink.userPricedRungs ?? []) {
    const existing = rungs.findIndex((entry) => sameVolumeMl(entry.volumeMl, rung.volumeMl));
    if (existing === -1) rungs.push(rung);
    else rungs[existing] = rung;
  }

  return rungs.sort((a, b) => a.volumeMl - b.volumeMl);
}

/**
 * What one serving of this drink costs, at the serving currently selected.
 *
 * Replaces the old `servingPrice`, which scaled a single stored price by
 * `selectedMl / pricedVolumeMl`. That divisor came from a mutable field, so
 * remembering a serve silently redefined the unit every stored price was
 * quoted in. Here the price is resolved from rungs and never rescaled.
 */
export function servingPriceFor(
  drink: EstablishmentDrink & {
    rememberedServingMl?: number | null;
    userPricedRungs?: PricedRung[];
  },
  servingId: string,
  customMl: number | null,
): PriceResolution {
  const selectedMl = servingMl(drink, servingId, customMl);
  if (selectedMl === null) return { status: "unpriced" };
  return resolvePrice(selectedMl, rungsFor(drink));
}

/** The money for one serving, or null. For callers that only want a figure. */
export function servingPrice(
  drink: EstablishmentDrink & {
    rememberedServingMl?: number | null;
    userPricedRungs?: PricedRung[];
  },
  servingId: string,
  customMl: number | null,
): number | null {
  const resolved = servingPriceFor(drink, servingId, customMl);
  return resolved.status === "priced" ? resolved.total : null;
}

/**
 * The volume a typed price applies to: whatever serving is on screen.
 *
 * This replaces `basePriceFromServingPrice`, and it is deliberately not a
 * conversion. A typed price is stored against the volume it was typed against,
 * full stop — that is what makes the value stable. Returns null when the
 * serving is not commitable, so there is nothing to price.
 */
export function pricedVolumeForEntry(
  drink: EstablishmentDrink & { rememberedServingMl?: number | null },
  servingId: string,
  customMl: number | null,
): number | null {
  const selectedMl = servingMl(drink, servingId, customMl);
  return selectedMl !== null && selectedMl > 0 ? selectedMl : null;
}

/**
 * The rung a typed Custom volume collapses into, or null when it is genuinely
 * a new volume. Uses `sameVolumeMl` so the picker and the pricing lookup agree
 * on what counts as the same volume — a stricter rule here would let
 * 30.0000001 ml become a second 30 ml rung, giving one volume two prices.
 */
export function servingOptionForVolume(
  drink: EstablishmentDrink,
  volumeMl: number,
): ServingOption | null {
  if (!Number.isFinite(volumeMl) || volumeMl <= 0) return null;
  return (
    servingOptionsFor(drink).find(
      (option) => option.ml != null && sameVolumeMl(option.ml, volumeMl),
    ) ?? null
  );
}
