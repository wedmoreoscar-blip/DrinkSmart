import { describe, expect, it } from "vitest";
import {
  NUMERIC_FIELD_INPUT_MODE,
  NUMERIC_FIELD_RANGE,
  numericFieldText,
  parseNumericField,
  parseNumericFieldInRange,
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

// Oscar, 2026-08-17: typing `2` into a spirit's custom ml wrote 25, and the
// next keystrokes landed after a 5 he never typed — `250` became `2550`, which
// clamped to 1000. Clamping per keystroke is only safe if the committed value
// is never rendered back into the box mid-entry, and it was.
describe("parseNumericFieldInRange — what a field calls while typing", () => {
  it("leaves a below-minimum keystroke uncommitted instead of clamping it", () => {
    expect(parseNumericFieldInRange("serve", "2")).toBeNull();
    expect(parseNumericField("serve", "2")).toBe(25);
  });

  it("commits the moment the text is a legal serve", () => {
    expect(parseNumericFieldInRange("serve", "25")).toBe(25);
    expect(parseNumericFieldInRange("serve", "250")).toBe(250);
  });

  it("refuses an above-maximum value rather than pinning it to the top", () => {
    expect(parseNumericFieldInRange("serve", "2550")).toBeNull();
    expect(parseNumericField("serve", "2550")).toBe(1000);
  });

  it("holds the same line for the other fields", () => {
    expect(parseNumericFieldInRange("abv", "70")).toBeNull();
    expect(parseNumericFieldInRange("abv", "40")).toBe(40);
    expect(parseNumericFieldInRange("price", "1000")).toBeNull();
    expect(parseNumericFieldInRange("price", "3.5")).toBe(3.5);
  });

  it("treats empty and unparseable text as nothing typed yet", () => {
    expect(parseNumericFieldInRange("serve", "")).toBeNull();
    expect(parseNumericFieldInRange("serve", "1.25e-")).toBeNull();
  });
});
