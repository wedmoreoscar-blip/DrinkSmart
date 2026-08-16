import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260817000100_user_drink_overrides.sql", import.meta.url),
  "utf8",
);

describe("user drink overrides migration", () => {
  it("carries both overrides on one record per user per drink", () => {
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.user_drink_overrides/);
    expect(migration).toMatch(/price numeric/);
    expect(migration).toMatch(/serving_ml numeric/);
    expect(migration).toMatch(
      /UNIQUE \(user_id, establishment_drink_id\)/,
    );
  });

  it("cascades from both parents so no override outlives its drink or its user", () => {
    expect(migration).toMatch(/user_id uuid NOT NULL[\s\S]*?REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
    expect(migration).toMatch(
      /establishment_drink_id uuid NOT NULL[\s\S]*?REFERENCES public\.establishment_drinks\(id\) ON DELETE CASCADE/,
    );
  });

  it("is owner-only under the locked (select auth.uid()) pattern", () => {
    expect(migration).toMatch(/ALTER TABLE public\.user_drink_overrides ENABLE ROW LEVEL SECURITY/);
    for (const action of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      expect(migration).toMatch(new RegExp(`FOR ${action}`));
    }
    // The whole point of 23e: never a bare auth.uid() in a policy predicate.
    expect(migration).not.toMatch(/(?<!select )auth\.uid\(\) = user_id/);
    expect(migration).toMatch(/user_drink_overrides_user_id_idx/);
  });

  it("brings establishment_drinks' pre-existing policies onto the same pattern", () => {
    expect(migration).toMatch(/USING \(user_id IS NULL OR \(select auth\.uid\(\)\) = user_id\)/);
    // Rewriting policies must not touch the catalogue rows themselves.
    expect(migration).not.toMatch(/(?:DELETE FROM|TRUNCATE|DROP TABLE)\s+public\.establishment_drinks/i);
  });
});
