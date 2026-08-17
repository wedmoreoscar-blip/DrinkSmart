/**
 * Parsing, clamping and input hints for the three numeric drink fields.
 *
 * These rules used to live inside the `4o` keypad primitive, which owned them
 * only because it was the single numeric entry surface in the app. Numbers are
 * now typed on the user's own device keyboard, so the custom-drink sheet and
 * the scanner review each render native inputs and share the rules from here
 * rather than re-deriving a clamp table apiece.
 */

export type NumericFieldKey = "abv" | "serve" | "price";

/** Inclusive [min, max] per field. Serve matches the scanner's own bounds. */
export const NUMERIC_FIELD_RANGE: Record<NumericFieldKey, readonly [number, number]> = {
  abv: [0, 60],
  serve: [25, 1000],
  price: [0, 999],
};

/**
 * Keyboard hint only. `serve` is quoted in whole ml so it asks for the numeric
 * pad; strength and price are decimal. Neither hint rounds anything — a scanned
 * serving can legitimately be fractional (29.57 ml from an ounce).
 */
export const NUMERIC_FIELD_INPUT_MODE: Record<NumericFieldKey, "decimal" | "numeric"> = {
  abv: "decimal",
  serve: "numeric",
  price: "decimal",
};

/**
 * `type="number"` draws stepper arrows, and both surfaces place a unit adornment
 * exactly where they would land. Suppress them without touching the shared Input.
 */
export const NO_NUMBER_SPINNER =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none";

/**
 * Parse raw input text into a clamped value, or null when it holds no number.
 * Clamping on every keystroke is deliberate and matches the keypad it replaces:
 * the committed value is always in range, while the caller keeps the half-typed
 * text in state so nothing is rewritten under the user mid-entry.
 */
export const parseNumericField = (key: NumericFieldKey, text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) return null;
  const [min, max] = NUMERIC_FIELD_RANGE[key];
  return Math.min(Math.max(parsed, min), max);
};

/**
 * Parse only a value that is already in range, else null. **Nothing is clamped.**
 *
 * This is what a field should call while the user is still typing. Clamping
 * per keystroke turns every value whose first digits fall below the minimum
 * into the minimum: in a 25–1000 ml serve field, typing `2` commits 25, and if
 * the caller then re-renders the box from the committed value the user is
 * typing after a `5` they never entered — `250` becomes `2550`, which clamps
 * to 1000. Returning null instead leaves the committed value alone until the
 * text means something, and `parseNumericField` still clamps on commit.
 */
export const parseNumericFieldInRange = (
  key: NumericFieldKey,
  text: string,
): number | null => {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) return null;
  const [min, max] = NUMERIC_FIELD_RANGE[key];
  return parsed >= min && parsed <= max ? parsed : null;
};

/** Render a committed value back into input text; null is an empty field. */
export const numericFieldText = (value: number | null): string =>
  value === null ? "" : String(value);
