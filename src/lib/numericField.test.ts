import { describe, expect, it } from "vitest";
import {
  NUMERIC_FIELD_INPUT_MODE,
  NUMERIC_FIELD_RANGE,
  numericFieldText,
  parseNumericField,
} from "./numericField";

// The clamp table these cover came from the deleted `4o` keypad primitive. It is
// the one piece of that component's behaviour that had to survive the move to
// native inputs, so it is tested directly rather than through either consumer.

describe("parseNumericField", () => {
  it("returns null for text that holds no number", () => {
    expect(parseNumericField("abv", "")).toBeNull();
    expect(parseNumericField("abv", "   ")).toBeNull();
    expect(parseNumericField("price", "abc")).toBeNull();
  });

  it("keeps an in-range value exactly, including decimals", () => {
    expect(parseNumericField("abv", "4.6")).toBe(4.6);
    expect(parseNumericField("serve", "568")).toBe(568);
    expect(parseNumericField("price", "7.25")).toBe(7.25);
  });

  it("clamps to each field's documented range", () => {
    expect(parseNumericField("abv", "70")).toBe(60);
    expect(parseNumericField("abv", "-3")).toBe(0);
    expect(parseNumericField("serve", "5")).toBe(25);
    expect(parseNumericField("serve", "5000")).toBe(1000);
    expect(parseNumericField("price", "1200")).toBe(999);
  });

  // A scanned ounce serving normalizes to 29.5735 ml. Rounding serve to whole ml
  // would silently rewrite a value the user never touched, so it must not happen.
  it("does not round serve, despite its numeric keyboard hint", () => {
    expect(parseNumericField("serve", "29.5735")).toBe(29.5735);
    expect(NUMERIC_FIELD_INPUT_MODE.serve).toBe("numeric");
  });

  it("agrees with the exported range table", () => {
    for (const [key, [min, max]] of Object.entries(NUMERIC_FIELD_RANGE)) {
      const field = key as keyof typeof NUMERIC_FIELD_RANGE;
      expect(parseNumericField(field, String(min - 1))).toBe(min);
      expect(parseNumericField(field, String(max + 1))).toBe(max);
    }
  });
});

describe("numericFieldText", () => {
  it("renders null as an empty field rather than a zero", () => {
    expect(numericFieldText(null)).toBe("");
  });

  it("round-trips a parsed value", () => {
    expect(numericFieldText(parseNumericField("abv", "4.6"))).toBe("4.6");
    expect(numericFieldText(parseNumericField("serve", "568"))).toBe("568");
  });
});
