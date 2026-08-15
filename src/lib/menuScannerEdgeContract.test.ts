import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const edgeFunction = readFileSync(
  new URL("../../supabase/functions/parse-menu/index.ts", import.meta.url),
  "utf8",
);

describe("menu scanner Edge extraction contract", () => {
  it("pins the stable low-cost vision model and forced extraction tool", () => {
    expect(edgeFunction).toContain('const VISION_MODEL = "google/gemini-3.1-flash-lite"');
    expect(edgeFunction).toContain("tool_choice: { type: 'function', function: { name: 'extract_menu_drinks' } }");
    expect(edgeFunction).toContain("Maximum 5 images allowed per request");
  });

  it("extracts soft/no/low alcohol rows as distinct menu drinks without inventing facts", () => {
    for (const category of ["soft-drinks", "no-alcohol", "low-alcohol", "alcopops", "rtd"]) {
      expect(edgeFunction).toContain(category);
    }
    expect(edgeFunction).toMatch(/include clearly listed soft drinks/i);
    expect(edgeFunction).not.toMatch(/skip non-alcoholic items/i);
    expect(edgeFunction).toMatch(/null if it is not visible; never guess a default/i);
  });
});
