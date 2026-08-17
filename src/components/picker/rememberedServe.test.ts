import { describe, expect, it } from "vitest";
import type { EstablishmentDrink } from "@/hooks/useEstablishments";
import type { PricedRung } from "@/lib/basePricing";
import {
  defaultServingFor,
  pricedVolumeForEntry,
  pureAlcoholMl,
  rungsFor,
  servingMl,
  servingOptionForVolume,
  servingOptionsFor,
  servingPrice,
} from "@/components/picker/picker-model";

type Resolved = EstablishmentDrink & {
  rememberedServingMl?: number | null;
  userPricedRungs?: PricedRung[];
};

function beer(overrides: Partial<Resolved> = {}): Resolved {
  return {
    id: "d1",
    establishment_id: "v1",
    drink_name: "Lager",
    abv: 5,
    category: "beer",
    category_label: "Beer & cider",
    price: 4,
    volume: 1,
    volume_unit: "pint",
    ...overrides,
  };
}

// W6-2 clause 3: a remembered serve is the user's default for that drink,
// everywhere — including the sorts and the swap screen's eligibility maths.
describe("a remembered serve as the drink's default", () => {
  it("opens on Custom", () => {
    expect(defaultServingFor(beer({ rememberedServingMl: 400 })).id).toBe("custom");
  });

  it("keeps the category's rung when nothing is remembered", () => {
    expect(defaultServingFor(beer()).id).toBe("pint");
  });

  it("does not add or remove a serving rung", () => {
    expect(servingOptionsFor(beer({ rememberedServingMl: 400 })).map((o) => o.id)).toEqual(
      servingOptionsFor(beer()).map((o) => o.id),
    );
  });

  // The defect this test exists for: Custom carries ml: null, so a remembered
  // drink measured through its own default serving resolved to nothing and
  // ranked as the weakest drink on the screen.
  it("measures its own volume through the default serving, not zero", () => {
    const drink = beer({ rememberedServingMl: 400 });
    const serving = defaultServingFor(drink);
    expect(servingMl(drink, serving.id, null)).toBe(400);
    expect(pureAlcoholMl(drink, serving.id, null)).toBeCloseTo(20, 6);
  });

  it("still yields nothing for Custom with neither a typed nor a remembered volume", () => {
    expect(servingMl(beer(), "custom", null)).toBeNull();
    expect(pureAlcoholMl(beer(), "custom", null)).toBe(0);
  });

  it("prefers a typed custom amount over the remembered one", () => {
    expect(servingMl(beer({ rememberedServingMl: 400 }), "custom", 250)).toBe(250);
  });
});

// Price is per base unit. The remembered serve is a *serving* preference and
// no longer the denominator of anything — that coupling is what let remembering
// a serve silently redefine the unit every stored price was quoted in.
describe("a price belongs to the volume it was typed against", () => {
  it("stores against the serving on screen, with no conversion", () => {
    const drink = beer({ rememberedServingMl: 400 });
    expect(pricedVolumeForEntry(drink, "custom", 400)).toBe(400);
    expect(pricedVolumeForEntry(drink, "pint", null)).toBeCloseTo(568, 0);
    // Nothing commitable, so nothing to price.
    expect(pricedVolumeForEntry(beer(), "custom", null)).toBeNull();
  });

  it("reads a rung back at exactly what was typed", () => {
    const drink = beer({ price: null, userPricedRungs: [{ volumeMl: 400, price: 5 }] });
    expect(servingPrice(drink, "custom", 400)).toBeCloseTo(5, 6);
  });

  it("does not scale one rung into another", () => {
    // 200 ml is half of a priced 400 ml, and is still not priced: the app asks
    // rather than halving a figure the user never quoted for 200 ml.
    const drink = beer({ price: null, userPricedRungs: [{ volumeMl: 400, price: 5 }] });
    expect(servingPrice(drink, "custom", 200)).toBeNull();
  });

  it("is stable across repeated commits", () => {
    // The old model rescaled an already-scaled number on every edit. Here the
    // stored figure is the typed figure, so re-committing changes nothing.
    const drink = beer({ price: null, userPricedRungs: [{ volumeMl: 284, price: 2 }] });
    const shown = servingPrice(drink, "half", null)!;
    expect(shown).toBeCloseTo(2, 6);
    const recommitted = beer({
      price: null,
      userPricedRungs: [{ volumeMl: pricedVolumeForEntry(drink, "half", null)!, price: shown }],
    });
    expect(servingPrice(recommitted, "half", null)).toBeCloseTo(2, 6);
  });

  it("returns null when the drink has no price at all", () => {
    expect(servingPrice(beer({ price: null }), "pint", null)).toBeNull();
  });
});

describe("the rung ladder", () => {
  it("takes the catalogue row's own price as a rung at its own volume", () => {
    expect(rungsFor(beer({ price: 4 }))).toEqual([{ volumeMl: 568, price: 4 }]);
  });

  it("lets a user rung override the catalogue rung at the same volume", () => {
    const drink = beer({ price: 4, userPricedRungs: [{ volumeMl: 568, price: 3.5 }] });
    expect(rungsFor(drink)).toEqual([{ volumeMl: 568, price: 3.5 }]);
  });

  it("keeps user rungs at other volumes, ascending", () => {
    const drink = beer({ price: 4, userPricedRungs: [{ volumeMl: 284, price: 2.2 }] });
    expect(rungsFor(drink)).toEqual([
      { volumeMl: 284, price: 2.2 },
      { volumeMl: 568, price: 4 },
    ]);
  });
});

// A typed Custom value equal to an existing rung collapses into it, so one
// volume never ends up with two prices.
describe("a custom volume that matches a rung", () => {
  it("finds the rung it should collapse into", () => {
    expect(servingOptionForVolume(beer(), 568)?.id).toBe("pint");
    expect(servingOptionForVolume(beer(), 284)?.id).toBe("half");
  });

  it("returns null for a genuinely new volume", () => {
    expect(servingOptionForVolume(beer(), 400)).toBeNull();
    expect(servingOptionForVolume(beer(), 0)).toBeNull();
  });
});
