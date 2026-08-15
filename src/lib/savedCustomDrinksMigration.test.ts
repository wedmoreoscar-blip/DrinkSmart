import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { Database } from "@/integrations/supabase/types";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260815000001_saved_custom_drink_serving_ml.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("saved custom drink reusable serving migration", () => {
  it("adds a legacy-compatible bounded serving and own-row update policy", () => {
    expect(migration).toMatch(/ADD COLUMN serving_ml numeric/);
    expect(migration).toMatch(
      /CHECK \(serving_ml IS NULL OR \(serving_ml > 0 AND serving_ml <= 5000\)\)/,
    );
    expect(migration).toMatch(
      /FOR UPDATE[\s\S]*USING \(auth\.uid\(\) = user_id\)[\s\S]*WITH CHECK \(auth\.uid\(\) = user_id\)/,
    );
    expect(migration).not.toMatch(/DROP (?:TABLE|POLICY|INDEX)/i);
  });

  it("keeps serving nullable in generated Row, Insert and Update contracts", () => {
    type SavedTable = Database["public"]["Tables"]["saved_custom_drinks"];
    const row: Pick<SavedTable["Row"], "serving_ml"> = { serving_ml: null };
    const insert: Pick<SavedTable["Insert"], "serving_ml"> = {};
    const update: Pick<SavedTable["Update"], "serving_ml"> = {};

    expect(row.serving_ml).toBeNull();
    expect(insert.serving_ml).toBeUndefined();
    expect(update.serving_ml).toBeUndefined();
  });
});
