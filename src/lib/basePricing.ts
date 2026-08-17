/**
 * Price is per base unit, never a total.
 *
 * The number a user types is the price of *one* rung — one shot, one pint, one
 * 175 ml glass — and this module multiplies. Nothing here ever divides a total
 * the user gave, and no stored price is re-interpreted after the fact.
 *
 * That last point is the reason this module exists. The previous model stored
 * one price per drink and divided it by a `pricedVolumeMl` derived from a
 * *mutable* field: remembering a serve silently redefined the unit every stored
 * price was quoted in, so £25 typed against a 250 ml serve read back as £2.50
 * the moment that serve was remembered. Here a price is bound to the volume it
 * was typed against and is never rescaled.
 *
 * See the `price-per-base-unit` spec for the full design.
 */

/** A volume that carries a price of its own. */
export type PricedRung = {
  /** The volume this price is the price of. Always positive. */
  volumeMl: number;
  /** Money for exactly one of this rung. Always >= 0. */
  price: number;
};

/** How a volume was priced, kept so the UI can explain itself. */
export type PriceBreakdown = {
  /** Total money for the volume asked about. */
  total: number;
  /**
   * The rungs that made it up, each with how many of it. An exact stored price
   * yields a single entry of count 1.
   */
  parts: { rung: PricedRung; count: number }[];
  /** True when a stored price for the exact volume was used verbatim. */
  exact: boolean;
};

/**
 * Why a volume has no price — because the two reasons need opposite behaviour.
 *
 * `needs-price` is not a failure. It is the design working: this volume cannot
 * be made from the rungs that *are* priced, so rather than guess, the app asks
 * for a price for this volume — which then becomes a rung of its own, exactly
 * as the 330 ml cocktail does. 60 ml against 25 ml and 50 ml lands here.
 *
 * `unpriced` means nothing is priced for this drink at all, and that is fine
 * and common. Price is optional everywhere; a drink with none must plan, pace
 * and appear on the timeline without ever being nagged for one.
 *
 * Collapsing the two into a bare null is what would make the app either nag
 * about drinks nobody priced, or fall silent exactly when it should ask.
 */
export type PriceResolution =
  | ({ status: "priced" } & PriceBreakdown)
  | { status: "needs-price"; volumeMl: number }
  | { status: "unpriced" };

const EPSILON = 1e-6;

function isUsableRung(rung: PricedRung): boolean {
  return (
    Number.isFinite(rung.volumeMl) &&
    rung.volumeMl > 0 &&
    Number.isFinite(rung.price) &&
    rung.price >= 0
  );
}

/**
 * Volumes are compared with a tolerance because they arrive from `numeric`
 * columns and from user typing. 568 and 568.0000001 are the same pint.
 *
 * Exported because the picker must decide "is this typed Custom value one of
 * the rungs we already have?" using *this* rule and not its own. A stricter
 * comparison there would let 30.0000001 ml become a second 30 ml rung, giving
 * one volume two prices — precisely the ambiguity this design exists to remove.
 */
export function sameVolumeMl(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) < EPSILON;
}

function sameVolume(a: number, b: number): boolean {
  return sameVolumeMl(a, b);
}

/**
 * The price of one volume, or null when it cannot be priced without guessing.
 *
 * Precedence, per the spec:
 *   1. a stored price for that exact volume wins outright;
 *   2. otherwise the *fewest-unit* exact decomposition into priced rungs,
 *      tie-broken on the cheaper total;
 *   3. otherwise null — no price is shown and the user is invited to price it.
 *
 * Never proportional, never rounded. 300 ml of beer is not 0.528 of a pint: it
 * is unpriceable from a pint alone, and saying so is the point. A volume with
 * no exact combination becomes a rung in its own right once the user prices it.
 */
export function resolvePrice(volumeMl: number, rungs: PricedRung[]): PriceResolution {
  const usable = rungs.filter(isUsableRung);

  // A volume that is not a volume yet — a Custom box with nothing typed in it.
  // There is nothing to price and nothing to ask for.
  if (!Number.isFinite(volumeMl) || volumeMl <= 0) return { status: "unpriced" };

  // Nothing priced for this drink at all. Not a problem to solve: rule 18.
  if (usable.length === 0) return { status: "unpriced" };

  // 1. An exact stored price outranks any decomposition of the same volume,
  //    even one that would resolve. If the user priced 250 ml directly, that is
  //    the price of 250 ml — 5 doubles is not a second opinion.
  const exact = usable.find((rung) => sameVolume(rung.volumeMl, volumeMl));
  if (exact) {
    return {
      status: "priced",
      total: exact.price,
      parts: [{ rung: exact, count: 1 }],
      exact: true,
    };
  }

  // 2. Search, rather than peel off the largest rung. Greedy is wrong here:
  //    300 ml of wine against rungs 125/175/250 takes 250, strands 50 and
  //    fails, while 125 + 175 is exact. Greedy would send the user off to price
  //    a volume that is perfectly expressible.
  const best = fewestUnitDecomposition(volumeMl, usable);

  // 3. This drink has prices, but none of them can build this volume. Ask for
  //    one — do not round, do not scale, and do not stay quiet about it.
  if (!best) return { status: "needs-price", volumeMl };

  // Largest rung first, so a breakdown reads the way it would be said aloud:
  // "a double and a single", not "a single and a double".
  const parts = [...best.parts].sort((a, b) => b.rung.volumeMl - a.rung.volumeMl);

  return { status: "priced", total: best.total, parts, exact: false };
}

/** The breakdown when one exists, else null. For callers that only want money. */
export function priceForVolume(
  volumeMl: number,
  rungs: PricedRung[],
): PriceBreakdown | null {
  const resolved = resolvePrice(volumeMl, rungs);
  if (resolved.status !== "priced") return null;
  const { status: _status, ...breakdown } = resolved;
  return breakdown;
}

type Decomposition = {
  total: number;
  units: number;
  parts: { rung: PricedRung; count: number }[];
};

/**
 * Exact integer decompositions only, preferring the fewest units and then the
 * cheaper total.
 *
 * Fewest-units is not an aesthetic choice: a smaller rung is proportionally
 * dearer almost everywhere, so preferring big ones is what stops a large round
 * being systematically overcharged. 3408 ml of beer is 6 pints at £3 (£18), not
 * 12 halves at £2 (£24).
 */
function fewestUnitDecomposition(
  volumeMl: number,
  rungs: PricedRung[],
): Decomposition | null {
  // Work in integer tenths of a millilitre so the search is exact. Volumes come
  // from numeric(10,2) columns and from typed input, and floating-point
  // remainders would otherwise make an exact combination look inexact.
  const scale = 10;
  const target = Math.round(volumeMl * scale);
  if (target <= 0) return null;

  const scaled = rungs
    .map((rung) => ({ rung, step: Math.round(rung.volumeMl * scale) }))
    .filter((entry) => entry.step > 0 && entry.step <= target)
    // Largest first: it reaches the fewest-unit answer earlier, which prunes
    // more of the search.
    .sort((a, b) => b.step - a.step);

  if (scaled.length === 0) return null;

  // best[v] = the best way to make exactly v, or null if v is unreachable.
  const best: (Decomposition | null)[] = new Array(target + 1).fill(null);
  best[0] = { total: 0, units: 0, parts: [] };

  for (let volume = 1; volume <= target; volume += 1) {
    let chosen: Decomposition | null = null;

    for (const { rung, step } of scaled) {
      if (step > volume) continue;
      const rest = best[volume - step];
      if (!rest) continue;

      const candidate: Decomposition = {
        total: rest.total + rung.price,
        units: rest.units + 1,
        parts: addOne(rest.parts, rung),
      };

      if (!chosen || isBetter(candidate, chosen)) chosen = candidate;
    }

    best[volume] = chosen;
  }

  return best[target];
}

/** Fewest units first; the cheaper total breaks a tie. */
function isBetter(candidate: Decomposition, incumbent: Decomposition): boolean {
  if (candidate.units !== incumbent.units) return candidate.units < incumbent.units;
  return candidate.total < incumbent.total - EPSILON;
}

function addOne(
  parts: { rung: PricedRung; count: number }[],
  rung: PricedRung,
): { rung: PricedRung; count: number }[] {
  const index = parts.findIndex((part) => sameVolume(part.rung.volumeMl, rung.volumeMl));
  if (index === -1) return [...parts, { rung, count: 1 }];
  const next = parts.slice();
  next[index] = { rung: next[index].rung, count: next[index].count + 1 };
  return next;
}

/**
 * The price of `count` servings of one volume — what the tray sums and what the
 * Plan tab totals. Null propagates: an unpriced drink contributes nothing and
 * must never be counted as £0.
 */
export function priceForServings(
  volumeMl: number,
  count: number,
  rungs: PricedRung[],
): number | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  const breakdown = priceForVolume(volumeMl, rungs);
  if (!breakdown) return null;
  return breakdown.total * count;
}

/**
 * Sum a plan or tray. Entries that cannot be priced are skipped, and the sum is
 * null when *nothing* could be priced — the locked rule that an unpriced plan
 * shows no money at all rather than £0.
 */
export function sumPrices(values: (number | null)[]): number | null {
  let total = 0;
  let anyPriced = false;
  for (const value of values) {
    if (value == null || !Number.isFinite(value)) continue;
    anyPriced = true;
    total += value;
  }
  return anyPriced ? total : null;
}
