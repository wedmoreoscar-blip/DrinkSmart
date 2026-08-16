import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260816000000_saved_custom_drink_price.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("saved custom drink price migration", () => {
  it("adds a legacy-compatible bounded price column", () => {
    expect(migration).toMatch(/ADD COLUMN price numeric/);
    expect(migration).toMatch(
      /CHECK \(price IS NULL OR \(price >= 0 AND price <= 1000\)\)/,
    );
    expect(migration).not.toMatch(/NOT NULL/);
    expect(migration).not.toMatch(/DROP (?:TABLE|POLICY|INDEX|COLUMN)/i);
  });

  // The earlier serving_ml migration wrote a bare auth.uid() policy, against the
  // locked (select auth.uid()) pattern. This one adds no policy at all, so it
  // must not have copied that mistake forward.
  it("adds no policy, and so no bare auth.uid() call", () => {
    expect(migration).not.toMatch(/CREATE POLICY/i);
    expect(migration).not.toMatch(/^\s*[^-].*auth\.uid\(\)/m);
  });
});
