import { getCategoryDefaultUnit, type CatalogItem } from "@/lib/planCatalog";
import type { GeneratePlanInput, GeneratedDrink, GeneratedPlan } from "@/lib/generatePlan";

// Per-category soft taste axes used to score against user preferences.
// Values are 0..1. Sweet: higher = sweeter. Strong: higher = higher-ABV / hits faster.
const CATEGORY_AXES: Record<string, { sweet: number; strong: number }> = {
  beer_pint: { sweet: 0.2, strong: 0.3 },
  beer_bottle: { sweet: 0.2, strong: 0.3 },
  cider: { sweet: 0.7, strong: 0.3 },
  spritz: { sweet: 0.6, strong: 0.4 },
  cocktails: { sweet: 0.7, strong: 0.5 },
  wine_red: { sweet: 0.3, strong: 0.5 },
  wine_white: { sweet: 0.4, strong: 0.5 },
  wine_rose: { sweet: 0.5, strong: 0.5 },
  wine_sparkling: { sweet: 0.5, strong: 0.5 },
  alcopops: { sweet: 0.9, strong: 0.4 },
  gin: { sweet: 0.1, strong: 1.0 },
  vodka: { sweet: 0.1, strong: 1.0 },
  rum: { sweet: 0.2, strong: 1.0 },
  whiskey: { sweet: 0.1, strong: 1.0 },
  tequila: { sweet: 0.1, strong: 1.0 },
  brandy: { sweet: 0.2, strong: 1.0 },
  liqueurs: { sweet: 0.8, strong: 0.8 },
  shots: { sweet: 0.4, strong: 1.0 },
};

const DEFAULT_AXES = { sweet: 0.5, strong: 0.5 };

function ethanolPerServing(item: CatalogItem): number {
  return item.typical_ml * (item.abv / 100);
}

function scoreItem(
  item: CatalogItem,
  prefs: GeneratePlanInput["preferences"]
): number {
  const axes = CATEGORY_AXES[item.category] ?? DEFAULT_AXES;
  const sweetDist = Math.abs(axes.sweet - prefs.sweet);
  const strongDist = Math.abs(axes.strong - prefs.strong);
  const likedBoost = prefs.categories_liked.includes(item.category) ? 0.5 : 0;
  // Lower distance + liked boost → higher score
  return likedBoost - (sweetDist + strongDist) * 0.5;
}

function orderByArc(picks: CatalogItem[]): CatalogItem[] {
  // "Lighter → strongest mid-third → taper":
  // - sort by ABV ascending
  // - lift the single heaviest item out and place it at ~2/3 of the way through
  if (picks.length <= 2) {
    return [...picks].sort((a, b) => a.abv - b.abv);
  }
  const ascending = [...picks].sort((a, b) => a.abv - b.abv);
  const heaviest = ascending[ascending.length - 1];
  const rest = ascending.slice(0, -1);
  const peakIdx = Math.min(
    Math.max(0, Math.floor((2 * (rest.length + 1)) / 3)),
    rest.length
  );
  return [...rest.slice(0, peakIdx), heaviest, ...rest.slice(peakIdx)];
}

function toGeneratedDrink(item: CatalogItem): GeneratedDrink {
  const unit = getCategoryDefaultUnit(item.category);
  if (unit === "ml" || unit === "oz") {
    return {
      catalog_id: item.id,
      quantity: 1,
      unit,
      ml: item.typical_ml,
    };
  }
  return {
    catalog_id: item.id,
    quantity: 1,
    unit,
  };
}

/**
 * Deterministic offline-safe fallback. Picks drinks greedily to hit the
 * ethanol budget, biased by preferences. Always succeeds (never throws).
 *
 * `target_ethanol_ml` is the remaining budget for new drinks; locked ethanol
 * has already been subtracted by the caller and is never subtracted again.
 * Locked drinks are excluded from the pool so they are not re-included.
 */
export function greedyPlanFallback(input: GeneratePlanInput): GeneratedPlan {
  let remainingBudget = Number.isFinite(input.target_ethanol_ml)
    ? Math.max(0, input.target_ethanol_ml)
    : 0;

  // Filter by hard rules (avoided categories + explicit excludes + locked drinks)
  const excludeSet = new Set<string>([
    ...(input.exclude ?? []),
    ...(input.locked_drinks ?? []).map((d) => d.catalog_id),
  ]);
  let pool = input.catalog.filter(
    (item) =>
      !excludeSet.has(item.id) &&
      !input.preferences.categories_avoided.includes(item.category)
  );

  // Pre-score every item once
  const scored = pool.map((item) => ({
    item,
    score: scoreItem(item, input.preferences),
    ethanol: ethanolPerServing(item),
  }));

  const picks: CatalogItem[] = [];
  const usedIds = new Set<string>();
  const tolerance = remainingBudget * 0.05;
  const overshootCap = (budget: number) => budget * 1.1;

  // Cap how many drinks we'll add — rough rule of thumb of 1 every 30 minutes
  const maxDrinks = Math.max(1, Math.ceil(input.duration_minutes / 30));

  while (remainingBudget > tolerance && picks.length < maxDrinks) {
    const cap = overshootCap(remainingBudget);
    // Candidates that fit within the cap and haven't already been picked
    const candidates = scored.filter(
      (c) => !usedIds.has(c.item.id) && c.ethanol > 0 && c.ethanol <= cap
    );
    if (candidates.length === 0) break;

    // Pick the one that best balances closeness-to-budget and preference score
    candidates.sort((a, b) => {
      const aDist = Math.abs(a.ethanol - remainingBudget);
      const bDist = Math.abs(b.ethanol - remainingBudget);
      const aRank = aDist - a.score * 5; // score nudge worth ~5ml of ethanol
      const bRank = bDist - b.score * 5;
      return aRank - bRank;
    });

    const best = candidates[0];
    picks.push(best.item);
    usedIds.add(best.item.id);
    remainingBudget -= best.ethanol;
  }

  const ordered = orderByArc(picks);

  return {
    drinks: ordered.map(toGeneratedDrink),
    notes:
      picks.length === 0
        ? "No catalog items fit your budget — try a longer duration or adjust preferences."
        : `Built offline from your catalog. ${picks.length} drink${picks.length === 1 ? "" : "s"}, lighter to start.`,
  };
}
