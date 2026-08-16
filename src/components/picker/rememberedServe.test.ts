import { describe, expect, it } from "vitest";
import type { EstablishmentDrink } from "@/hooks/useEstablishments";
import {
  basePriceFromServingPrice,
  defaultServingFor,
  pricedVolumeMl,
  pureAlcoholMl,
  servingMl,
  servingOptionsFor,
  servingPrice,
} from "@/components/picker/picker-model";

type Resolved = EstablishmentDrink & { rememberedServingMl?: number | null };

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

// W6-2 clause 3, second half: the remembered serve is the volume the user's
// price is for, so it is the base per-serving scaling divides by.
describe("the remembered serve as the priced volume", () => {
  it("takes precedence over the row's own database volume", () => {
    expect(pricedVolumeMl(beer({ rememberedServingMl: 400 }))).toBe(400);
    expect(pricedVolumeMl(beer())).toBeCloseTo(568, 0);
  });

  it("prices the remembered serve at exactly the stored price", () => {
    const drink = beer({ rememberedServingMl: 400, price: 5 });
    expect(servingPrice(drink, "custom", 400)).toBeCloseTo(5, 6);
  });

  it("scales a different serving against the remembered volume", () => {
    const drink = beer({ rememberedServingMl: 400, price: 5 });
    expect(servingPrice(drink, "custom", 200)).toBeCloseTo(2.5, 6);
  });

  it("returns null when the drink has no price at all", () => {
    expect(servingPrice(beer({ price: null }), "pint", null)).toBeNull();
  });
});

// The round-trip defect: the row shows a price scaled to the serving on
// screen, so committing that displayed figure unchanged would rescale an
// already-scaled number and the price would drift on every edit.
describe("price round-trips without drifting", () => {
  it("is the identity when the selected serving is the priced volume", () => {
    const drink = beer({ rememberedServingMl: 400, price: 5 });
    const shown = servingPrice(drink, "custom", 400)!;
    expect(basePriceFromServingPrice(drink, "custom", 400, shown)).toBeCloseTo(5, 6);
  });

  it("converts back to the stored figure from a different serving", () => {
    const drink = beer({ price: 4 }); // priced per pint
    const shownForHalf = servingPrice(drink, "half", null)!;
    expect(shownForHalf).toBeCloseTo(2, 6);
    expect(basePriceFromServingPrice(drink, "half", null, shownForHalf)).toBeCloseTo(4, 6);
  });

  it("survives two consecutive commits unchanged", () => {
    const drink = beer({ price: 4 });
    const once = basePriceFromServingPrice(drink, "half", null, servingPrice(drink, "half", null)!)!;
    const twice = basePriceFromServingPrice(
      { ...drink, price: once },
      "half",
      null,
      servingPrice({ ...drink, price: once }, "half", null)!,
    )!;
    expect(twice).toBeCloseTo(4, 6);
  });

  it("yields null when the selected serving has no committable volume", () => {
    expect(basePriceFromServingPrice(beer(), "custom", null, 5)).toBeNull();
  });
});
