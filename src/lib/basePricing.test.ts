import { describe, expect, it } from "vitest";
import {
  priceForServings,
  priceForVolume,
  resolvePrice,
  sameVolumeMl,
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

  it("prices a named volume only from its own rung", () => {
    // A user typing 250 ml is choosing a serving, not ordering five doubles.
    expect(resolvePrice(250, SPIRITS).status).toBe("needs-price");
    expect(priceForVolume(250, [...SPIRITS, rung(250, 18)])?.total).toBeCloseTo(18, 6);
  });

  it("does not build a big volume out of small rungs", () => {
    // 3408 ml is six pints' worth, and is still not priced: a volume the user
    // names is a serving of its own, not a sum of the ladder.
    expect(resolvePrice(3408, BEER).status).toBe("needs-price");
  });

  it("never reads a double as two singles", () => {
    // The arithmetic per-rung pricing exists to refuse: a bar's double is
    // rarely twice its single, so an unpriced double shows nothing.
    expect(resolvePrice(50, [rung(25, 2.5)]).status).toBe("needs-price");
  });



  it("asks for a price for any volume it has no price for", () => {
    expect(resolvePrice(60, SPIRITS)).toEqual({ status: "needs-price", volumeMl: 60 });
    expect(resolvePrice(300, BEER)).toEqual({ status: "needs-price", volumeMl: 300 });
    // Including one the ladder could have summed to. Nothing is derived.
    expect(resolvePrice(75, SPIRITS)).toEqual({ status: "needs-price", volumeMl: 75 });
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

// A US bar pours 30 ml and 60 ml. Pricing those volumes is what creates them as
// rungs — the design needs nothing else to support a different measure system.
describe("rungs the user creates", () => {
  const US_SPIRITS = [rung(30, 3), rung(60, 5)];

  it("prices US measures once the user has priced them", () => {
    expect(priceForVolume(30, US_SPIRITS)?.total).toBeCloseTo(3, 6);
    expect(priceForVolume(60, US_SPIRITS)?.total).toBeCloseTo(5, 6);
    // One single and two doubles: distinct volumes, so distinct plan cards.
    expect(priceForServings(60, 2, US_SPIRITS)).toBeCloseTo(10, 6);
  });

  it("uses the double's own price rather than twice the single", () => {
    // A bar's double is rarely twice its single, which is why each rung is
    // priced separately. £5, not £6.
    expect(priceForVolume(60, US_SPIRITS)?.exact).toBe(true);
    expect(priceForVolume(60, US_SPIRITS)?.total).toBeCloseTo(5, 6);
  });


  it("shares one volume-matching rule with the picker", () => {
    // The picker collapses a typed Custom into an existing rung using this
    // exact comparison. A stricter one there would create a duplicate rung.
    expect(sameVolumeMl(30, 30.0000001)).toBe(true);
    expect(sameVolumeMl(30, 30.5)).toBe(false);
    expect(sameVolumeMl(Number.NaN, 30)).toBe(false);
  });
});
