/**
 * Deterministic fallback values for drinks whose printed facts were not read.
 * This module is the pure source of truth shared by scanner normalization and
 * the plan catalogue: both estimate missing ABV/serving from the same rules,
 * so the review preview, the saved row and the AI generation catalogue never
 * disagree about a fallback.
 *
 * Only explicit soft/no-alcohol classifications fall back to 0%: a drink that
 * simply failed to classify is never treated as alcohol-free, because a wrong
 * zero silently understates the plan's alcohol. Unknown rows fall back to the
 * cocktail defaults (15%, 330 ml) like the rest of the catalogue.
 */

export type FallbackDrinkClassification =
  | "beer"
  | "wine"
  | "spirit"
  | "cocktail"
  | "soft"
  | "low"
  | "alcopop"
  | "unknown";

const FALLBACK_ABV: Record<FallbackDrinkClassification, number> = {
  beer: 5,
  wine: 13,
  spirit: 40,
  cocktail: 15,
  soft: 0,
  low: 1.2,
  alcopop: 4,
  unknown: 15,
};

const FALLBACK_SERVE_ML: Record<FallbackDrinkClassification, number> = {
  beer: 568,
  wine: 175,
  spirit: 25,
  cocktail: 330,
  soft: 330,
  low: 330,
  alcopop: 330,
  unknown: 330,
};

/**
 * Classify a drink from its model category slug and human-readable label.
 * Ordering matters: low/no-alcohol labels are matched before generic spirit
 * patterns, and mocktails are soft drinks, never cocktails.
 */
export function classifyDrink(
  category: string | null | undefined,
  categoryLabel: string | null | undefined,
): FallbackDrinkClassification {
  const source = `${category ?? ""} ${categoryLabel ?? ""}`.trim().toLowerCase();

  if (/low[ -]?alcohol/.test(source)) return "low";
  const explicitlyZeroPercent = /(?:^|[^\d.])0(?:\.0+)?\s*%/.test(source);
  if (
    /no[ -]?alcohol|non[ -]?alcohol|soft[ -]?drink|soft drink|mocktail|alcohol[- ]?free/.test(source) ||
    explicitlyZeroPercent
  ) {
    return "soft";
  }
  if (/cocktail|spritz/.test(source)) return "cocktail";
  if (/wine|champagne|merlot|chardonnay|pinot|rioja|shiraz/.test(source)) return "wine";
  if (/beer|lager|ale|ipa|stout|cider/.test(source)) return "beer";
  if (/alcopop|rtd|ready[ -]?to[ -]?drink/.test(source)) return "alcopop";
  if (/spirit|vodka|gin|rum|whisk|tequila|brandy|cognac|liqueur|shot/.test(source)) return "spirit";
  return "unknown";
}

/** The deterministic ABV (percent) used when the printed ABV is missing. */
export function fallbackAbv(
  category: string | null | undefined,
  categoryLabel: string | null | undefined,
): number {
  return FALLBACK_ABV[classifyDrink(category, categoryLabel)];
}

/** The deterministic serving in ml used when the printed serving is missing. */
export function fallbackServeMl(
  category: string | null | undefined,
  categoryLabel: string | null | undefined,
): number {
  return FALLBACK_SERVE_ML[classifyDrink(category, categoryLabel)];
}
