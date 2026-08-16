import { describe, expect, it } from "vitest";

import type { Establishment, EstablishmentDrink } from "@/hooks/useEstablishments";
import { resolveActiveVenueId } from "@/hooks/useEstablishments";
import { buildActiveVenueCatalog } from "@/lib/planCatalog";

const wetherspoons: Establishment = {
  id: "wetherspoons",
  name: "Wetherspoons",
  isGlobal: true,
};

const globalFallback: Establishment = {
  id: "generic-pub",
  name: "Generic pub",
  isGlobal: true,
};

const customVenue: Establishment = {
  id: "my-bar",
  name: "My bar",
  isGlobal: false,
};

const row = (venueId: string): EstablishmentDrink => ({
  id: `${venueId}-drink-1`,
  establishment_id: venueId,
  drink_name: "House wine",
  abv: 12,
  category: "wine_red",
  category_label: "Red Wine",
  price: 6.5,
  volume: 250,
  volume_unit: "ml",
});

describe("Wave 5 active venue contract", () => {
  it("retains a persisted venue only while it still exists", () => {
    expect(resolveActiveVenueId([wetherspoons, customVenue], customVenue.id)).toBe(customVenue.id);
    expect(resolveActiveVenueId([wetherspoons], customVenue.id)).toBe(wetherspoons.id);
  });

  it("defaults to exact global Wetherspoons, then the first global, never a user venue", () => {
    expect(resolveActiveVenueId([customVenue, globalFallback, wetherspoons], null)).toBe(
      wetherspoons.id,
    );
    expect(resolveActiveVenueId([customVenue, globalFallback], null)).toBe(globalFallback.id);
    expect(resolveActiveVenueId([customVenue], null)).toBeNull();
    expect(resolveActiveVenueId([], null)).toBeNull();
  });

  it("builds stable venue-row catalog items with database serving volumes", () => {
    expect(buildActiveVenueCatalog(customVenue, [row(customVenue.id)])).toEqual([
      {
        id: "my-bar-drink-1",
        name: "House wine",
        abv: 12,
        typical_ml: 250,
        category: "wine_white",
        price: 6.5,
      },
    ]);
  });

  it("uses static fallback only for empty Wetherspoons and never for an empty custom venue", () => {
    expect(buildActiveVenueCatalog(wetherspoons, []).length).toBeGreaterThan(0);
    expect(buildActiveVenueCatalog(customVenue, [])).toEqual([]);
    expect(buildActiveVenueCatalog(null, [])).toEqual([]);
  });

  it("uses the shared category fallbacks only when legacy rows lack ABV or serving volume", () => {
    const legacySpirit: EstablishmentDrink = {
      ...row(customVenue.id),
      id: "legacy-spirit",
      drink_name: "House vodka",
      abv: null,
      category: "spirits",
      category_label: "Vodka",
      volume: null,
      volume_unit: null,
    };
    const storedWine = row(customVenue.id);

    expect(buildActiveVenueCatalog(customVenue, [legacySpirit, storedWine])).toEqual([
      {
        id: "legacy-spirit",
        name: "House vodka",
        abv: 40,
        typical_ml: 25,
        category: "vodka",
        price: 6.5,
      },
      {
        id: "my-bar-drink-1",
        name: "House wine",
        abv: 12,
        typical_ml: 250,
        category: "wine_white",
        price: 6.5,
      },
    ]);
  });
});
