import { describe, expect, it } from "vitest";
import {
  priceForServings,
  priceForVolume,
  resolvePrice,
  sumPrices,
  type PricedRung,
} from "./basePricing";

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

  it("asks for a price when no exact combination exists, rather than going quiet", () => {
    // 60 ml against 25 and 50 has no combination. It is never approximated or
    // rounded — the app asks for a price for 60 ml, which then becomes a rung.
    expect(resolvePrice(60, SPIRITS)).toEqual({ status: "needs-price", volumeMl: 60 });
    // 300 ml of beer is not 0.528 of a pint, so it asks too.
    expect(resolvePrice(300, BEER)).toEqual({ status: "needs-price", volumeMl: 300 });
  });

  // The distinction that keeps the app from nagging about drinks nobody priced
  // while staying silent exactly when it ought to ask.
  it("separates 'ask me for this volume' from 'this drink has no prices'", () => {
    expect(resolvePrice(60, SPIRITS).status).toBe("needs-price");
    expect(resolvePrice(60, []).status).toBe("unpriced");
    // A Custom box with nothing typed in it is not a demand for a price.
    expect(resolvePrice(0, SPIRITS).status).toBe("unpriced");
    expect(resolvePrice(Number.NaN, SPIRITS).status).toBe("unpriced");
  });

  it("does not ask when a lower rung could have been substituted", () => {
    // Q1: pint unpriced, half pint priced. 568 ml is two halves, so it prices
    // exactly — the ban on substitution is about not *scaling* one rung into
    // another, not about refusing an exact combination.
    expect(resolvePrice(568, [rung(284, 2)])).toMatchObject({ status: "priced", total: 4 });
    // But 400 ml cannot be built from halves, so it asks.
    expect(resolvePrice(400, [rung(284, 2)]).status).toBe("needs-price");
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
