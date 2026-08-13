import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { DrinkFilters } from "@/components/DrinkFilterPopover";
import type { EstablishmentDrink } from "@/hooks/useEstablishments";
import { CategoryScreen } from "./CategoryScreen";
import { DrinkRow } from "./DrinkRow";
import { entryQuantity, perUnitVolumeMl } from "./picker-model";

const drink = (
  id: string,
  name: string,
  abv: number | null,
  volume: number,
  volumeUnit = "ml",
): EstablishmentDrink =>
  ({
    id,
    establishment_id: "venue-1",
    drink_name: name,
    abv,
    category: "beer",
    category_label: "Beer",
    price: 5,
    volume,
    volume_unit: volumeUnit,
  }) as EstablishmentDrink;

const filters: DrinkFilters = {
  abvRange: { min: 0, max: 100 },
  selectedCategories: [],
};

describe("W4-5 picker contract", () => {
  it("recomputes a half from half the pint volume and commits one fractional-pint entry", () => {
    const pint = drink("pint", "Pint", 4, 568, "pint");

    expect(perUnitVolumeMl(pint, "pint")).toBe(568);
    expect(perUnitVolumeMl(pint, "half")).toBe(284);
    expect((perUnitVolumeMl(pint, "half") * 4) / 100).toBeCloseTo(11.36);
    expect(entryQuantity(pint, 3, "half")).toBe("1.5");
  });

  it("sorts least alcohol by serve volume × ABV, not by ABV alone", () => {
    const html = renderToStaticMarkup(
      <CategoryScreen
        categoryLabel="Beer"
        drinks={[
          drink("large-low", "Large low ABV", 4, 568),
          drink("small-high", "Small high ABV", 5, 250),
        ]}
        filters={filters}
        onFiltersChange={() => {}}
        sort="Least alcohol first"
        onSortChange={() => {}}
        selectedId={null}
        quantity={1}
        portion="pint"
        onSelect={() => {}}
        onQuantityChange={() => {}}
        onPortionChange={() => {}}
        onBack={() => {}}
      />,
    );

    expect(html.indexOf("Small high ABV")).toBeLessThan(html.indexOf("Large low ABV"));
  });

  it("shows missing strength as an em dash and treats it as zero alcohol", () => {
    const html = renderToStaticMarkup(
      <DrinkRow
        drink={drink("gap", "Unknown strength", null, 330)}
        selected={false}
        quantity={1}
        portion="pint"
        onSelect={() => {}}
        onQuantityChange={() => {}}
        onPortionChange={() => {}}
      />,
    );

    expect(html).toContain("—% · 330 ml · 0.0 ml");
    expect(html).not.toContain("0.0% · 330 ml");
  });
});
