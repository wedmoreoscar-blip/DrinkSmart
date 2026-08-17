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

/** How a volume was priced. One rung, since nothing is derived. */
export type PriceBreakdown = {
  /** Total money for the volume asked about. */
  total: number;
  /** The rung it came from. Always exactly one, at count 1. */
  parts: { rung: PricedRung; count: number }[];
  /** Always true. Kept so callers reading `.exact` stay honest if this grows. */
  exact: boolean;
};

/**
 * Why a volume has no price — because the two reasons need opposite behaviour.
 *
 * `needs-price` is not a failure. It is the design working: no price has been
 * set for this volume, so rather than derive one, the app asks — and the answer
 * becomes a rung of its own, exactly as a 330 ml cocktail does.
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

/**
 * The price of one volume — the price set for THAT volume, or nothing.
 *
 * Nothing is derived. A price applies to exactly the serving it was set for:
 * not scaled, not rounded, and not summed out of smaller rungs. A double is not
 * two singles, and a 250 ml pour is not five doubles — if a user names a volume,
 * that is a serving they are choosing, distinct from the ladder, and it carries
 * its own price or none at all.
 *
 * Decomposition was built and then removed (2026-08-17, Oscar). It let an
 * unpriced double read as twice the single, which is the exact arithmetic
 * per-rung pricing exists to refuse — a bar's double is rarely twice its
 * single. Someone who wants two pints asks for two pints.
 */
export function resolvePrice(volumeMl: number, rungs: PricedRung[]): PriceResolution {
  const usable = rungs.filter(isUsableRung);

  // A volume that is not a volume yet — a Custom box with nothing typed in it.
  if (!Number.isFinite(volumeMl) || volumeMl <= 0) return { status: "unpriced" };

  // Nothing priced for this drink at all, which is fine and common.
  if (usable.length === 0) return { status: "unpriced" };

  const exact = usable.find((rung) => sameVolumeMl(rung.volumeMl, volumeMl));
  if (exact) {
    return {
      status: "priced",
      total: exact.price,
      parts: [{ rung: exact, count: 1 }],
      exact: true,
    };
  }

  // Priced elsewhere, but not here. Ask for this volume rather than guess it.
  return { status: "needs-price", volumeMl };
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
