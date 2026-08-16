import { describe, expect, it } from "vitest";
import {
  parseSession,
  serializeSession,
  type LoadedSession,
} from "@/lib/sessionStore";

function validLoadedSession(): LoadedSession {
  return {
    inebriationLevel: 3,
    drinks: [
      {
        id: "beer-1",
        category: "beer_pint",
        drink: "Guinness",
        quantity: "2",
        unit: "pints",
      },
      {
        id: "wine-1",
        category: "wine_red",
        drink: "Merlot",
        quantity: "1",
        unit: "glass",
      },
    ],
    lockedDrinkIds: ["beer-1"],
    drinkingStartTime: new Date(Date.parse("2026-01-10T21:30:00Z")),
    drinkingTargetTime: new Date(Date.parse("2026-01-11T01:30:00Z")),
    breaks: [
      { entryId: "break-1", durationMinutes: 20, volumeMl: 330, drinkName: "Water" },
    ],
    consumedTimelineEntries: [
      {
        entryId: "beer-1:unit:1",
        sourceDrinkId: "beer-1",
        consumedAt: new Date(Date.parse("2026-01-10T22:00:00Z")),
        pureAlcoholMl: 23.288,
      },
    ],
    delayedEntryMinutes: { "beer-1:unit:2": 15, "wine-1:unit:1": 30 },
    budget: { min: 20, max: 60 },
  };
}

describe("serializeSession", () => {
  it("stores dates as ISO strings", () => {
    const persisted = serializeSession(validLoadedSession());
    expect(persisted.drinkingStartTime).toBe("2026-01-10T21:30:00.000Z");
    expect(persisted.drinkingTargetTime).toBe("2026-01-11T01:30:00.000Z");
    expect(persisted.consumedTimelineEntries[0].consumedAt).toBe("2026-01-10T22:00:00.000Z");
    expect(persisted.breaks).toEqual([
      { entryId: "break-1", durationMinutes: 20, volumeMl: 330, drinkName: "Water" },
    ]);
    expect(persisted.delayedEntryMinutes).toEqual({ "beer-1:unit:2": 15, "wine-1:unit:1": 30 });
  });

  it("serializes null dates as null", () => {
    const session = validLoadedSession();
    session.drinkingStartTime = null;
    session.drinkingTargetTime = null;
    const persisted = serializeSession(session);
    expect(persisted.drinkingStartTime).toBeNull();
    expect(persisted.drinkingTargetTime).toBeNull();
  });
});

describe("parseSession", () => {
  it("round-trips a fully populated payload", () => {
    const loaded = validLoadedSession();
    const parsed = parseSession(serializeSession(loaded));
    expect(parsed).not.toBeNull();
    expect(parsed!.inebriationLevel).toBe(3);
    expect(parsed!.lockedDrinkIds).toEqual(["beer-1"]);
    expect(parsed!.drinkingStartTime!.getTime()).toBe(Date.parse("2026-01-10T21:30:00Z"));
    expect(parsed!.drinkingTargetTime!.getTime()).toBe(Date.parse("2026-01-11T01:30:00Z"));
    expect(parsed!.breaks).toEqual(loaded.breaks);
    expect(parsed!.consumedTimelineEntries).toHaveLength(1);
    expect(parsed!.consumedTimelineEntries[0].consumedAt.getTime()).toBe(
      Date.parse("2026-01-10T22:00:00Z")
    );
    expect(parsed!.delayedEntryMinutes).toEqual({ "beer-1:unit:2": 15, "wine-1:unit:1": 30 });
  });

  it("hydrates a legacy payload with empty defaults when all new fields are absent", () => {
    const legacy = {
      inebriationLevel: 2,
      drinks: [{ id: "beer-1", category: "beer_pint", drink: "Guinness", quantity: "1", unit: "pints" }],
      lockedDrinkIds: [],
      drinkingStartTime: "2026-01-10T21:30:00.000Z",
      drinkingTargetTime: "2026-01-11T01:30:00.000Z",
    };
    const parsed = parseSession(legacy);
    expect(parsed).not.toBeNull();
    expect(parsed!.breaks).toEqual([]);
    expect(parsed!.consumedTimelineEntries).toEqual([]);
    expect(parsed!.delayedEntryMinutes).toEqual({});
    expect(parsed!.drinkingStartTime!.getTime()).toBe(Date.parse("2026-01-10T21:30:00Z"));
  });

  // The budget is why the storage key stayed `.v1`: a payload written before
  // it must keep its session and pick up the wide default, not be discarded.
  it("hydrates a pre-budget payload to the wide default", () => {
    const parsed = parseSession({
      inebriationLevel: 2,
      drinks: [],
      lockedDrinkIds: [],
    });
    expect(parsed!.budget).toEqual({ min: 0, max: null });
  });

  it("round-trips a bounded budget and a no-limit budget", () => {
    const bounded = validLoadedSession();
    expect(parseSession(serializeSession(bounded))!.budget).toEqual({ min: 20, max: 60 });

    const noLimit = { ...validLoadedSession(), budget: { min: 15, max: null } };
    const persisted = serializeSession(noLimit);
    expect(persisted.budgetMax).toBeNull();
    expect(parseSession(persisted)!.budget).toEqual({ min: 15, max: null });
  });

  it("repairs a corrupt stored budget instead of dropping the session", () => {
    const parsed = parseSession({
      inebriationLevel: 3,
      drinks: [],
      budgetMin: -40,
      budgetMax: "sixty",
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.budget).toEqual({ min: 0, max: null });
  });

  it("returns null for non-object payloads and missing inebriationLevel", () => {
    expect(parseSession(null)).toBeNull();
    expect(parseSession("junk")).toBeNull();
    expect(parseSession({})).toBeNull();
    expect(parseSession({ inebriationLevel: "3" })).toBeNull();
  });

  it("filters malformed breaks and invalid durations", () => {
    const parsed = parseSession({
      inebriationLevel: 3,
      drinks: [],
      breaks: [
        { entryId: "good", durationMinutes: 10, drinkName: "Water" },
        { entryId: "", durationMinutes: 10, drinkName: "Bad Id" },
        { entryId: "zero", durationMinutes: 0, drinkName: "Zero" },
        { entryId: "neg", durationMinutes: -5, drinkName: "Negative" },
        { entryId: "nan", durationMinutes: NaN, drinkName: "NaN" },
        { entryId: "no-duration", drinkName: "Missing" },
        "not-an-object",
      ],
    });
    expect(parsed!.breaks).toEqual([{ entryId: "good", durationMinutes: 10, drinkName: "Water" }]);
  });

  it("drops an invalid volumeMl but keeps the rest of the break", () => {
    const parsed = parseSession({
      inebriationLevel: 3,
      drinks: [],
      breaks: [
        { entryId: "a", durationMinutes: 10, drinkName: "Water", volumeMl: -5 },
        { entryId: "b", durationMinutes: 10, drinkName: "Water", volumeMl: 330 },
      ],
    });
    expect(parsed!.breaks).toEqual([
      { entryId: "a", durationMinutes: 10, drinkName: "Water" },
      { entryId: "b", durationMinutes: 10, drinkName: "Water", volumeMl: 330 },
    ]);
  });

  it("filters consumed entries with invalid dates, missing sources and bad ethanol", () => {
    const parsed = parseSession({
      inebriationLevel: 3,
      drinks: [{ id: "beer-1", category: "beer_pint", drink: "Guinness", quantity: "1", unit: "pints" }],
      consumedTimelineEntries: [
        {
          entryId: "beer-1:unit:1",
          sourceDrinkId: "beer-1",
          consumedAt: "2026-01-10T22:00:00.000Z",
          pureAlcoholMl: 23.288,
        },
        { entryId: "beer-1:unit:2", sourceDrinkId: "beer-1", consumedAt: "not-a-date", pureAlcoholMl: 23.288 },
        { entryId: "wine-1:unit:1", sourceDrinkId: "wine-1", consumedAt: "2026-01-10T22:00:00.000Z", pureAlcoholMl: 21 },
        { entryId: "beer-1:unit:3", sourceDrinkId: "beer-1", consumedAt: "2026-01-10T22:00:00.000Z", pureAlcoholMl: -1 },
        { entryId: "beer-1:unit:4", sourceDrinkId: "beer-1", consumedAt: "2026-01-10T22:00:00.000Z", pureAlcoholMl: NaN },
      ],
    });
    expect(parsed!.consumedTimelineEntries).toHaveLength(1);
    expect(parsed!.consumedTimelineEntries[0].entryId).toBe("beer-1:unit:1");
  });

  it("filters delayed minutes that are not positive or reference missing sources", () => {
    const parsed = parseSession({
      inebriationLevel: 3,
      drinks: [{ id: "beer-1", category: "beer_pint", drink: "Guinness", quantity: "1", unit: "pints" }],
      delayedEntryMinutes: {
        "beer-1:unit:1": 15,
        "beer-1:unit:2": 0,
        "beer-1:unit:3": -5,
        "beer-1:unit:4": NaN,
        "wine-1:unit:1": 30,
        junk: 10,
        "": 10,
      },
    });
    expect(parsed!.delayedEntryMinutes).toEqual({ "beer-1:unit:1": 15 });
  });

  it("coerces invalid drinking time strings to null", () => {
    const parsed = parseSession({
      inebriationLevel: 3,
      drinks: [],
      drinkingStartTime: "not-a-date",
      drinkingTargetTime: "2026-01-11T01:30:00.000Z",
    });
    expect(parsed!.drinkingStartTime).toBeNull();
    expect(parsed!.drinkingTargetTime!.getTime()).toBe(Date.parse("2026-01-11T01:30:00Z"));
  });
});
