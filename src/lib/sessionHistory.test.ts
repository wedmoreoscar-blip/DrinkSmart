import { describe, expect, it } from "vitest";
import type { Session } from "@supabase/supabase-js";
import {
  completedSessionDurationMinutes,
  historyAccountUserId,
  realSessionDrinks,
} from "@/lib/sessionHistory";

const authSession = (anonymous: boolean): Session =>
  ({ user: { id: anonymous ? "anon-id" : "account-id", is_anonymous: anonymous } }) as Session;

describe("session history contracts", () => {
  it("never treats an anonymous Supabase identity as a history account", () => {
    expect(historyAccountUserId(null)).toBeNull();
    expect(historyAccountUserId(authSession(true))).toBeNull();
    expect(historyAccountUserId(authSession(false))).toBe("account-id");
  });

  it("captures the selected duration and only real chosen drinks", () => {
    expect(
      completedSessionDurationMinutes(
        new Date("2026-08-15T22:30:00Z"),
        new Date("2026-08-16T01:30:00Z"),
        4,
      ),
    ).toBe(180);
    expect(completedSessionDurationMinutes(null, null, 3.5)).toBe(210);
    expect(
      realSessionDrinks([
        { id: "blank", category: "", drink: "", quantity: "", unit: "ml" },
        { id: "lager", category: "Beer & cider", drink: "Lager", quantity: "568", unit: "ml", portions: 1 },
      ]).map((drink) => drink.id),
    ).toEqual(["lager"]);
  });
});
