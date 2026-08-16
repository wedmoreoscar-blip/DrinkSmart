import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260817000000_session_history_budget_range.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("session history budget range migration", () => {
  it("adds both bounds as nullable columns", () => {
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS budget_min integer/);
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS budget_max integer/);
    // Nullable is the whole point: existing rows predate the budget and a
    // NOT NULL default would invent a band those nights never had.
    expect(migration).not.toMatch(/budget_(?:min|max) integer[^,;]*NOT NULL/);
  });

  it("rejects negative money and an inverted range while permitting either NULL", () => {
    expect(migration).toMatch(/CHECK \(budget_min IS NULL OR budget_min >= 0\)/);
    expect(migration).toMatch(/CHECK \(budget_max IS NULL OR budget_max >= 0\)/);
    expect(migration).toMatch(
      /CHECK \(budget_min IS NULL OR budget_max IS NULL OR budget_max >= budget_min\)/,
    );
  });

  it("leaves the table's snapshots insert-only and its policies alone", () => {
    expect(migration).not.toMatch(/CREATE POLICY/i);
    expect(migration).not.toMatch(/FOR UPDATE/i);
    expect(migration).not.toMatch(/DROP TABLE|DROP COLUMN/i);
  });
});
