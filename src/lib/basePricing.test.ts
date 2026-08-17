import { describe, expect, it } from "vitest";
import { priceForServings, priceForVolume, sumPrices, type PricedRung } from "./basePricing";

const rung = (volumeMl: number, price: number): PricedRung => ({ volumeMl, price });

// The ladders the picker actually offers.
const BEER = [rung(284, 2), rung(568, 3)];
const SPIRITS = [rung(25, 2.5), rung(50, 4)];
const WINE = [rung(125, 4), rung(175, 5), rung(250, 7)];

describe("price is per base unit, never a total", () => {
  it("multiplies a single rung by the count, and + moves the tray by one unit", () => {
    // Ten pints at £3 is £30, and the per-unit price never moves with quantity.
    expect(priceForServings(568, 10, BEER)).toBeCloseTo(30, 6);
    expect(priceForVolume(568, BEER)?.total).toBeCloseTo(3, 6);
  });

  it("prices a custom volume as a count of base units, agreeing with pressing +", () => {
    // 250 ml of vodka is five doubles — and must cost the same as five taps.
    expect(priceForVolume(250, SPIRITS)?.total).toBeCloseTo(20, 6);
    expect(priceForServings(50, 5, SPIRITS)).toBeCloseTo(20, 6);
  });

  it("uses the fewest units, so a big round is not charged in small rungs", () => {
    // Oscar's example: 3408 ml is 6 pints at £3, not 12 halves at £2.
    const breakdown = priceForVolume(3408, BEER);
    expect(breakdown?.total).toBeCloseTo(18, 6);
    expect(breakdown?.parts).toEqual([{ rung: rung(568, 3), count: 6 }]);
    expect(breakdown?.total).not.toBeCloseTo(24, 6);
  });

  it("prefers the double over the single, against the shot-based example", () => {
    // Q2: 250 ml is 5 doubles (£20), never 10 singles (£25).
    const breakdown = priceForVolume(250, SPIRITS);
    expect(breakdown?.parts).toEqual([{ rung: rung(50, 4), count: 5 }]);
    expect(breakdown?.total).toBeCloseTo(20, 6);
  });

  it("searches for a combination rather than peeling off the largest rung", () => {
    // 300 ml of wine: greedy takes 250, strands 50 and fails. 125 + 175 is exact.
    const breakdown = priceForVolume(300, WINE);
    expect(breakdown).not.toBeNull();
    expect(breakdown?.total).toBeCloseTo(9, 6);
    expect(breakdown?.parts).toHaveLength(2);
  });

  it("mixes rungs when that is the exact answer", () => {
    // 75 ml of spirit is one double plus one single.
    const breakdown = priceForVolume(75, SPIRITS);
    expect(breakdown?.total).toBeCloseTo(6.5, 6);
    expect(breakdown?.parts).toEqual([
      { rung: rung(50, 4), count: 1 },
      { rung: rung(25, 2.5), count: 1 },
    ]);
  });

  it("refuses a volume with no exact integer combination", () => {
    // 60 ml against 25 and 50 has no combination. The user prices 60 ml, and it
    // becomes a rung of its own — it is never approximated or rounded.
    expect(priceForVolume(60, SPIRITS)).toBeNull();
    // 300 ml of beer is not 0.528 of a pint.
    expect(priceForVolume(300, BEER)).toBeNull();
  });

  it("takes an exact stored price over any decomposition of the same volume", () => {
    // 250 ml priced directly at £18 beats 5 doubles at £20.
    const withExact = [...SPIRITS, rung(250, 18)];
    const breakdown = priceForVolume(250, withExact);
    expect(breakdown?.exact).toBe(true);
    expect(breakdown?.total).toBeCloseTo(18, 6);
    expect(breakdown?.parts).toEqual([{ rung: rung(250, 18), count: 1 }]);
  });

  it("prices a user-priced custom volume once it becomes a rung", () => {
    // The 330 ml cocktail: no ladder, the user's volume and price are the rung.
    const cocktail = [rung(330, 9)];
    expect(priceForVolume(330, cocktail)?.total).toBeCloseTo(9, 6);
    expect(priceForServings(330, 3, cocktail)).toBeCloseTo(27, 6);
  });

  it("breaks a fewest-unit tie on the cheaper total", () => {
    // Two ways to make 100 ml in two units: 50+50 (£8) and 25+75 (£7).
    const laddered = [rung(25, 2.5), rung(50, 4), rung(75, 4.5)];
    const breakdown = priceForVolume(100, laddered);
    expect(breakdown?.parts).toHaveLength(2);
    expect(breakdown?.total).toBeCloseTo(7, 6);
  });
});

describe("price is optional everywhere", () => {
  it("returns null rather than zero when nothing is priced", () => {
    expect(priceForVolume(568, [])).toBeNull();
    expect(priceForServings(568, 3, [])).toBeNull();
    // An unpriced rung is not a free one.
    expect(priceForVolume(568, [rung(568, Number.NaN)])).toBeNull();
  });

  it("sums only what is priced, and stays null when nothing is", () => {
    expect(sumPrices([null, null])).toBeNull();
    expect(sumPrices([])).toBeNull();
    expect(sumPrices([3, null, 4.5])).toBeCloseTo(7.5, 6);
    // A genuine zero is a price, not an absence.
    expect(sumPrices([0, null])).toBe(0);
  });

  it("rejects nonsense volumes and counts without throwing", () => {
    expect(priceForVolume(0, BEER)).toBeNull();
    expect(priceForVolume(-568, BEER)).toBeNull();
    expect(priceForVolume(Number.NaN, BEER)).toBeNull();
    expect(priceForServings(568, 0, BEER)).toBeNull();
    expect(priceForServings(568, -1, BEER)).toBeNull();
  });

  it("treats a rung as its volume regardless of numeric noise", () => {
    // Volumes arrive from numeric(10,2) columns; 568.000000001 is still a pint.
    expect(priceForVolume(568.0000001, BEER)?.total).toBeCloseTo(3, 6);
  });
});
