import { describe, expect, it } from "vitest";
import { calendarDaysAfter, clockDayNote } from "./clockDay";

const at = (iso: string) => new Date(iso);

describe("clockDayNote", () => {
  const lastDrink = at("2026-08-16T21:00:00");

  it("leaves a same-night time unqualified", () => {
    expect(clockDayNote(at("2026-08-16T23:40:00"), lastDrink)).toBeNull();
  });

  // The case that prompted this: 21:00 plus nineteen hours renders "16:00",
  // which reads as earlier the same evening rather than the following afternoon.
  it("marks a crossing time as tomorrow", () => {
    expect(clockDayNote(at("2026-08-17T16:00:00"), lastDrink)).toBe("tomorrow");
    expect(clockDayNote(at("2026-08-17T00:10:00"), lastDrink)).toBe("tomorrow");
  });

  it("counts days beyond one", () => {
    expect(clockDayNote(at("2026-08-18T03:00:00"), lastDrink)).toBe("+2d");
  });

  it("is null for a missing time and for one earlier than the reference", () => {
    expect(clockDayNote(null, lastDrink)).toBeNull();
    expect(clockDayNote(at("2026-08-15T23:00:00"), lastDrink)).toBeNull();
  });

  // Calendar days, not elapsed hours: 23:50 to 00:10 is twenty minutes but one day.
  it("counts calendar boundaries rather than elapsed time", () => {
    expect(calendarDaysAfter(at("2026-08-16T23:50:00"), at("2026-08-17T00:10:00"))).toBe(1);
    expect(calendarDaysAfter(at("2026-08-16T00:10:00"), at("2026-08-16T23:50:00"))).toBe(0);
  });
});
