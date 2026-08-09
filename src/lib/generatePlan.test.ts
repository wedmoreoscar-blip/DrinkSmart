import { describe, expect, it, vi } from "vitest";
import { buildStaticCatalog, type CatalogItem, type DrinkUnit } from "@/lib/planCatalog";
import type { GeneratedDrink } from "@/lib/generatePlan";
import { generatedDrinkToEntry } from "@/lib/generatePlan";
import { OZ_ML, PINT_ML, SHOT_ML } from "@/lib/drinkConstants";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const CATALOG: CatalogItem[] = [
  { id: "beer_pint::Guinness", name: "Guinness", abv: 4.1, typical_ml: 568, category: "beer_pint" },
  { id: "wine_red::Merlot", name: "Merlot", abv: 13, typical_ml: 175, category: "wine_red" },
  { id: "vodka::Absolut", name: "Absolut", abv: 40, typical_ml: 25, category: "vodka" },
  { id: "wine_white::Chardonnay", name: "Chardonnay", abv: 12.5, typical_ml: 175, category: "wine_white" },
  { id: "beer_bottle::Corona", name: "Corona", abv: 4.5, typical_ml: 330, category: "beer_bottle" },
];

type ConvertedEntry = {
  quantity: string;
  unit: DrinkUnit;
  customABV: string;
  drink: string;
  category: string;
  isCustom: boolean;
  id: string;
};

// Canonical client-side drink-ethanol formula (unit conversion × ABV), used to
// recompute ethanol from a converted DrinkEntry. Expected values per row are
// explicit literals matching the server's planDrinkEthanol arithmetic for the
// same fixture catalog and generated drink.
function ethanolFromEntry(entry: Pick<ConvertedEntry, "quantity" | "unit" | "customABV">): number {
  const qty = parseFloat(entry.quantity);
  const abv = parseFloat(entry.customABV) / 100;
  const volumeMl =
    entry.unit === "ml"
      ? qty
      : entry.unit === "oz"
        ? qty * OZ_ML
        : entry.unit === "shots"
          ? qty * SHOT_ML
          : entry.unit === "pints"
            ? qty * PINT_ML
            : qty * 175;
  return volumeMl * abv;
}

type Row = {
  name: string;
  generated: GeneratedDrink;
  expectedUnit: DrinkUnit;
  expectedQuantity: string;
  expectedVolumeMl: number;
  expectedEthanolMl: number;
};

const ROWS: Row[] = [
  {
    name: "ml with explicit ml override and quantity 2",
    generated: { catalog_id: "beer_bottle::Corona", quantity: 2, unit: "ml", ml: 250 },
    expectedUnit: "ml",
    expectedQuantity: "500",
    expectedVolumeMl: 500,
    expectedEthanolMl: 22.5,
  },
  {
    name: "ml without override uses the catalog typical serving",
    generated: { catalog_id: "beer_bottle::Corona", quantity: 1, unit: "ml" },
    expectedUnit: "ml",
    expectedQuantity: "330",
    expectedVolumeMl: 330,
    expectedEthanolMl: 14.85,
  },
  {
    name: "ml override with a single serving",
    generated: { catalog_id: "wine_white::Chardonnay", quantity: 1, unit: "ml", ml: 125 },
    expectedUnit: "ml",
    expectedQuantity: "125",
    expectedVolumeMl: 125,
    expectedEthanolMl: 15.625,
  },
  {
    name: "oz with explicit ml override and quantity 2 stores total ounces",
    generated: { catalog_id: "wine_white::Chardonnay", quantity: 2, unit: "oz", ml: 150 },
    expectedUnit: "oz",
    expectedQuantity: `${300 / OZ_ML}`,
    expectedVolumeMl: 300,
    expectedEthanolMl: 37.5,
  },
  {
    name: "oz without override multiplies the catalog serving by quantity",
    generated: { catalog_id: "vodka::Absolut", quantity: 3, unit: "oz" },
    expectedUnit: "oz",
    expectedQuantity: `${75 / OZ_ML}`,
    expectedVolumeMl: 75,
    expectedEthanolMl: 30,
  },
  {
    name: "shots on a 25 ml catalog serving converts to an exact ml entry",
    generated: { catalog_id: "vodka::Absolut", quantity: 2, unit: "shots" },
    expectedUnit: "ml",
    expectedQuantity: "50",
    expectedVolumeMl: 50,
    expectedEthanolMl: 20,
  },
  {
    name: "pints keeps the serving count",
    generated: { catalog_id: "beer_pint::Guinness", quantity: 2, unit: "pints" },
    expectedUnit: "pints",
    expectedQuantity: "2",
    expectedVolumeMl: 2 * PINT_ML,
    expectedEthanolMl: 46.576,
  },
  {
    name: "glass keeps the serving count",
    generated: { catalog_id: "wine_red::Merlot", quantity: 1, unit: "glass" },
    expectedUnit: "glass",
    expectedQuantity: "1",
    expectedVolumeMl: 175,
    expectedEthanolMl: 22.75,
  },
];

describe("generatedDrinkToEntry", () => {
  it.each(ROWS)("converts $name", (row) => {
    const entry = generatedDrinkToEntry(row.generated, CATALOG);
    expect(entry).not.toBeNull();
    expect(entry!.unit).toBe(row.expectedUnit);
    expect(entry!.category).toBe(
      CATALOG.find((c) => c.id === row.generated.catalog_id)!.category
    );
    expect(entry!.drink).toBe(
      CATALOG.find((c) => c.id === row.generated.catalog_id)!.name
    );
    expect(entry!.customABV).toBe(
      String(CATALOG.find((c) => c.id === row.generated.catalog_id)!.abv)
    );
    expect(entry!.isCustom).toBe(false);
    expect(entry!.id.length).toBeGreaterThan(0);
    expect(parseFloat(entry!.quantity)).toBeCloseTo(parseFloat(row.expectedQuantity), 9);
    expect(ethanolFromEntry(entry!)).toBeCloseTo(row.expectedEthanolMl, 9);
  });

  it("preserves the volume when converting oz entries back to millilitres", () => {
    const row = ROWS.find((r) => r.generated.unit === "oz" && r.generated.quantity === 2)!;
    const entry = generatedDrinkToEntry(row.generated, CATALOG)!;
    expect(parseFloat(entry.quantity) * OZ_ML).toBeCloseTo(row.expectedVolumeMl, 9);
  });

  it("preserves total millilitres for ml entries with quantity", () => {
    const row = ROWS[0];
    const entry = generatedDrinkToEntry(row.generated, CATALOG)!;
    expect(parseFloat(entry.quantity)).toBeCloseTo(row.expectedVolumeMl, 9);
  });

  it("preserves generated serving counts as timeline portions for volume entries", () => {
    const directVolume = generatedDrinkToEntry(ROWS[0].generated, CATALOG)!;
    const convertedShots = generatedDrinkToEntry(
      { catalog_id: "vodka::Absolut", quantity: 2, unit: "shots" },
      CATALOG
    )!;

    expect((directVolume as { portions?: number }).portions).toBe(2);
    expect((convertedShots as { portions?: number }).portions).toBe(2);
  });

  it("returns null for an unknown catalog id", () => {
    expect(
      generatedDrinkToEntry({ catalog_id: "mystery::Drink", quantity: 1, unit: "ml" }, CATALOG)
    ).toBeNull();
  });

  it("preserves server-recomputed ethanol for a production-catalog shot", () => {
    const catalog = buildStaticCatalog();
    const vodka = catalog.find((item) => item.category === "vodka")!;
    const generated: GeneratedDrink = {
      catalog_id: vodka.id,
      quantity: 2,
      unit: "shots",
    };
    const entry = generatedDrinkToEntry(generated, catalog)!;
    const serverEthanolMl = 2 * vodka.typical_ml * (vodka.abv / 100);

    expect(ethanolFromEntry(entry)).toBeCloseTo(serverEthanolMl, 9);
  });
});
