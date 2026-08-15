export const money = (p: number): string => (p === 0 ? "£0" : "£" + p.toFixed(2).replace(/\.00$/, ""));

export const fmtMl = (ml: number): string => (ml < 10 ? ml.toFixed(1) : String(Math.round(ml)));

export const PICKER_CATEGORY_ORDER = [
  "Beer & cider",
  "Wine",
  "Spirits",
  "Cocktails",
  "Soft & low-alcohol",
] as const;

export type PickerCategoryLabel = (typeof PICKER_CATEGORY_ORDER)[number];

/**
 * Catalog and scanner rows use several legacy/category-specific labels, while
 * the picker presents one fixed editorial grouping. Keep that presentation
 * rule here so the root and category screens use the same grouping.
 */
export const pickerCategoryFor = (
  category: string | null | undefined,
  categoryLabel: string | null | undefined,
): PickerCategoryLabel | null => {
  const source = `${category ?? ""} ${categoryLabel ?? ""}`.trim().toLowerCase();

  // Custom entries are represented by the explicit "Custom drink"
  // row, not a second dynamically-created category card.
  if (!source || /custom|other|not listed/.test(source)) return null;
  if (/cocktail|spritz/.test(source)) return "Cocktails";
  if (/wine|champagne|merlot|chardonnay|pinot|rioja|shiraz/.test(source)) return "Wine";
  if (/beer|lager|ale|ipa|stout|cider/.test(source)) return "Beer & cider";
  if (/spirit|vodka|gin|rum|whisk|whiskey|whisky|tequila|brandy|cognac|liqueur|shot|mixer/.test(source)) {
    return "Spirits";
  }
  if (/soft|low[- ]?alcohol|non[- ]?alcohol|mocktail|alcopop|rtd|ready[- ]?to[- ]?drink/.test(source)) {
    return "Soft & low-alcohol";
  }

  // Unknown catalog labels remain reachable without inventing another root
  // card; the curated picker has one final non-spirit bucket for them.
  return "Soft & low-alcohol";
};

export const PICKER_COPY = {
  screenLabel: "Add a drink",
  venueSub: (n: number) => n + " drinks",
  categorySub: (n: number, minPrice: number) => n + " · from " + money(minPrice),
  customCategory: { name: "Custom drink", sub: "add your own drink" },
  trayReading: (ml: number, target: number) => fmtMl(ml) + " of " + fmtMl(target) + " ml",
  traySub: (n: number) => "pure alcohol · " + n + (n === 1 ? " drink" : " drinks") + " so far",
  trayIdle: "Done",
  trayPending: (n: number) => "Add " + n,
};

export const CATEGORY_COPY = {
  rowSub: (abv: number | null, volumeMl: number, ethanolMl: number) =>
    (abv == null ? "—" : abv.toFixed(1)) + "% · " + fmtMl(volumeMl) +
    " ml each · " + fmtMl(ethanolMl) + " ml ethanol each",
  rowSubSingle: (abv: number | null, volumeMl: number, ethanolMl: number) =>
    (abv == null ? "—" : abv.toFixed(1)) + "% · " + fmtMl(volumeMl) +
    " ml · " + fmtMl(ethanolMl) + " ml ethanol",
  priceTotal: (p: number, n: number) => money(p * n),
  priceUnit: (p: number, n: number) => n + " × " + money(p),
  selectedSummary: (n: number, volumeMl: number, ethanolMl: number) =>
    n + " × " + fmtMl(volumeMl) + " ml · " +
    n + " × " + fmtMl(ethanolMl) + " ml ethanol",
  abvChip: (lo: number, hi: number) => "ABV " + lo + "–" + hi + "%",
  sort: ["Cheapest first", "Strongest first", "Least alcohol first"],
  trayPendingSub: (ml: number) => "of " + fmtMl(ml) + " ml — the pending amount reads hollow",
};

export const CUSTOM_COPY = {
  title: "Custom drink",
  fields: { name: "Name", abv: "Strength", serve: "Serve", price: "Price" },
  keepIt: (venue: string) => "Keep it on " + venue,
  saveToAccount: "Save drink to account",
  computed: (ml: number, pct: number) =>
    fmtMl(ml) + " ml pure alcohol — " + Math.round(pct) + "% of tonight",
  cta: "Add to plan",
};

export const CUSTOM_ERRORS = {
  name: "Give it a name — anything you'll recognise",
  abv: "Between 0 and 60%",
  serve: "Between 25 and 1000 ml",
  price: "Leave it blank if you didn't pay",
};
