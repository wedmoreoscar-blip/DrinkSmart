import { describe, expect, it } from "vitest";
import { NUMERIC_FIELD_RANGE, numericFieldText, parseNumericField } from "@/lib/numericField";

/**
 * Reported 2026-08-16: a Long Island Iced Tea reached a serving volume of
 * 1.25e-8 ml, after which its serve field could not be edited and its fixed
 * serving button appeared dead. The picker's custom-ml input was the one
 * numeric surface in the app parsing raw text itself instead of using these
 * shared rules.
 */
describe("serve field rejects what produced the 1.25e-8 volume", () => {
  it("clamps exponent notation into the real serving range", () => {
    expect(parseNumericField("serve", "1.25e-8")).toBe(NUMERIC_FIELD_RANGE.serve[0]);
    expect(parseNumericField("serve", "1e9")).toBe(NUMERIC_FIELD_RANGE.serve[1]);
  });

  it("clamps rather than accepting a physically impossible pour", () => {
    expect(parseNumericField("serve", "0")).toBe(25);
    expect(parseNumericField("serve", "-500")).toBe(25);
    expect(parseNumericField("serve", "99999")).toBe(1000);
  });

  it("keeps a real serve untouched", () => {
    expect(parseNumericField("serve", "250")).toBe(250);
    expect(parseNumericField("serve", "568")).toBe(568);
  });

  // The half-typed states a user passes through while backspacing. Each must
  // yield a value the caller can act on without the field fighting back.
  it("returns null for an empty or unparseable field rather than a number", () => {
    expect(parseNumericField("serve", "")).toBeNull();
    expect(parseNumericField("serve", "   ")).toBeNull();
    expect(parseNumericField("serve", "abc")).toBeNull();
  });

  it("round-trips a committed value back into editable text", () => {
    expect(numericFieldText(parseNumericField("serve", "250"))).toBe("250");
    expect(numericFieldText(null)).toBe("");
  });
});
