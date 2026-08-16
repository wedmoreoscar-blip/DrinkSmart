/**
 * The night's money range: what the user is willing to spend on their own
 * drinks this session.
 *
 * A range, not a ceiling. With the ethanol target fixed, the cheapest way to
 * hit it is to maximise ethanol per pound — value lager and bare spirit
 * measures — so a ceiling alone is only ever satisfied *more* by going
 * cheaper. `min` is the quality dial that stops that; see `docs/decisions.md`,
 * "Budget is a range, it belongs to the night, and the floor is the quality
 * dial".
 *
 * `max: null` means no upper limit. A fresh session starts maximally wide
 * (£0 – no limit) so an unset budget constrains nothing.
 */

export type BudgetRange = {
  /** Whole pounds. Never negative. */
  min: number;
  /** Whole pounds, or `null` for no upper limit. */
  max: number | null;
};

/** The slider's top stop. Reaching it means "no limit", not "£100". */
export const BUDGET_SLIDER_MAX_POUNDS = 100;
export const BUDGET_STEP_POUNDS = 5;

export const WIDE_BUDGET_RANGE: BudgetRange = { min: 0, max: null };

/** True when the range constrains nothing — the fresh-session default. */
export function isWideBudgetRange(range: BudgetRange): boolean {
  return range.min <= 0 && range.max === null;
}

function toPounds(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 0) return null;
  return Math.min(rounded, BUDGET_SLIDER_MAX_POUNDS);
}

/**
 * Coerce two untrusted values — from localStorage, from a history row — into a
 * usable range. Anything unreadable degrades to the wide default rather than
 * discarding the session around it, and an inverted range is widened at the
 * top rather than silently swapped.
 */
export function normalizeBudgetRange(min: unknown, max: unknown): BudgetRange {
  const normalizedMin = toPounds(min) ?? 0;
  const normalizedMax = toPounds(max);
  if (normalizedMax === null) return { min: normalizedMin, max: null };
  return { min: normalizedMin, max: Math.max(normalizedMax, normalizedMin) };
}

/** Range → the two-handle slider's value, with "no limit" at the top stop. */
export function budgetRangeToSlider(range: BudgetRange): [number, number] {
  const min = Math.min(Math.max(range.min, 0), BUDGET_SLIDER_MAX_POUNDS);
  const max = range.max === null ? BUDGET_SLIDER_MAX_POUNDS : range.max;
  return [min, Math.min(Math.max(max, min), BUDGET_SLIDER_MAX_POUNDS)];
}

/** Slider value → range. The top stop is "no limit", never a literal £100. */
export function sliderToBudgetRange(value: number[]): BudgetRange {
  const [min = 0, max = BUDGET_SLIDER_MAX_POUNDS] = value;
  return normalizeBudgetRange(min, max >= BUDGET_SLIDER_MAX_POUNDS ? null : max);
}

export function formatPounds(pounds: number): string {
  return `£${pounds}`;
}

export function formatBudgetRange(range: BudgetRange): string {
  const min = formatPounds(Math.max(range.min, 0));
  return range.max === null ? `${min} – no limit` : `${min} – ${formatPounds(range.max)}`;
}
