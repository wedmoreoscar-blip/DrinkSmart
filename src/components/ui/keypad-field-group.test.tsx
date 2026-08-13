import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KeypadFieldGroup, type KeypadField } from "./keypad-field-group";

// Derived from W4-1's clauses and 4o's script block, not from the implementation.
// This primitive is consumed by the scanner review (4i) and the custom-drink sheet
// (4f), so a regression here is a regression in both.

const fields = (over: Partial<KeypadField>[] = []): KeypadField[] => {
  const base: KeypadField[] = [
    { key: "abv", unit: "%", value: 4.6 },
    { key: "serve", unit: "ml", value: 568, integer: true },
    { key: "price", unit: "£", value: null },
  ];
  return base.map((f, i) => ({ ...f, ...(over[i] ?? {}) }));
};

const render = (props: Partial<Parameters<typeof KeypadFieldGroup>[0]> = {}) =>
  renderToStaticMarkup(
    <KeypadFieldGroup fields={fields()} onCommit={() => {}} onAdvance={() => {}} {...props} />,
  );

describe("KeypadFieldGroup (W4-1 / design 4o)", () => {
  // Clause 2. The gap glyph is called out twice in the design: "never an empty
  // box, never a zero". A zero here would be a wrong number in a venue's catalog.
  it("renders an em dash for a null value, not an empty well and not a zero", () => {
    const html = render();
    expect(html).toContain("—");
    expect(html).not.toMatch(/>\s*0\s*<\/div>/);
  });

  it("shows a real value rather than the gap glyph when one is present", () => {
    const html = render({ fields: fields([{ value: 4.6 }, { value: 568 }, { value: 7.2 }]) });
    expect(html).toContain("4.6");
    expect(html).toContain("568");
  });

  // Clause 2: every field carries its unit label beneath its own well.
  it("labels each well with its unit", () => {
    const html = render();
    for (const unit of ["%", "ml", "£"]) expect(html).toContain(unit);
  });

  // The keypad belongs to the ACTIVE field, not to the group. 4i draws its resting
  // state as wells and unit labels only, and 4f's initial frame draws no keypad
  // either. These tests previously rendered with no focus and asserted the keys and
  // the action were present, which locked in an always-open keypad that contradicts
  // both screens -- and put one 64px action on every gap card, so a two-gap review
  // showed three 64px primaries against the locked one-per-screen rule.
  it("draws no keypad and no action until a field is focused", () => {
    const html = render();
    expect(html).not.toContain("⌫");
    expect(html).not.toContain("Next gap");
    expect(html).not.toContain("Done");
  });

  it("still draws its wells and unit labels while closed", () => {
    const html = render();
    expect(html).toContain("—");
    expect(html).toMatch(/aria-label="[^"]*price[^"]*"/i);
  });

  // Clause 4 + 4o's actionLabel: "Next gap" while a gap remains, "Done" when none does.
  it("reads 'Next gap' while any field is still null", () => {
    expect(render({ focusKey: "price" })).toContain("Next gap");
  });

  it("reads 'Done' once no field is null", () => {
    const html = render({
      fields: fields([{ value: 4.6 }, { value: 568 }, { value: 7.2 }]),
      focusKey: "price",
    });
    expect(html).toContain("Done");
    expect(html).not.toContain("Next gap");
  });

  // Clause 3. The keypad replaces the OS keyboard; a native input would raise it
  // and defeat the point of the primitive.
  it("uses buttons rather than native inputs, so the OS keyboard never appears", () => {
    const html = render();
    expect(html).not.toContain("<input");
    expect(html).toContain("<button");
  });

  it("renders the ten digits and a backspace, and no letter keys", () => {
    const html = render({ focusKey: "price" });
    for (const d of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]) expect(html).toContain(`>${d}<`);
    expect(html).toContain("⌫");
  });

  // Clause 3: keys are 64px on purpose -- above the 56px floor, because a mis-tap
  // writes a wrong number into a venue's catalog.
  it("sizes keypad keys at the 64px action height, not the 56px minimum", () => {
    expect(render({ focusKey: "price" })).toContain("min-h-act");
  });

  // Clause 5.
  it("gives every well an accessible name built from its key and unit", () => {
    const html = render();
    expect(html).toMatch(/aria-label="[^"]*abv[^"]*"/i);
    expect(html).toMatch(/aria-label="[^"]*price[^"]*"/i);
  });

  it("renders the optional title and note when given", () => {
    const html = render({ title: "Camden Hells", note: "price unread" });
    expect(html).toContain("Camden Hells");
    expect(html).toContain("price unread");
  });

  // Clause 4: emptyIsAllowed is the consumer's business; the group never blocks.
  it("still offers its action when emptyIsAllowed is false and a gap remains", () => {
    const html = render({ emptyIsAllowed: false, focusKey: "price" });
    expect(html).toContain("Next gap");
  });
});
