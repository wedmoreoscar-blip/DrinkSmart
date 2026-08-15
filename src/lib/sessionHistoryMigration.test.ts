import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260815000000_user_session_history.sql", import.meta.url),
  "utf8",
);

describe("user session history migration", () => {
  it("creates immutable own-row UUID snapshots and prunes beyond 30", () => {
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.user_session_history/);
    expect(migration).toMatch(/id uuid PRIMARY KEY DEFAULT gen_random_uuid\(\)/);
    expect(migration).toMatch(/ALTER TABLE public\.user_session_history ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/FOR SELECT[\s\S]*auth\.uid\(\).*user_id/);
    expect(migration).toMatch(/FOR INSERT[\s\S]*auth\.uid\(\).*user_id/);
    expect(migration).toMatch(/FOR DELETE[\s\S]*auth\.uid\(\).*user_id/);
    expect(migration).not.toMatch(/FOR UPDATE/);
    expect(migration).toMatch(/ORDER BY completed_at DESC, id DESC[\s\S]*OFFSET 30/);
  });

  it("does not alter the legacy one-row table", () => {
    expect(migration).not.toMatch(/(?:ALTER|DROP|INSERT INTO)\s+(?:TABLE\s+)?public\.user_sessions/i);
  });
});
