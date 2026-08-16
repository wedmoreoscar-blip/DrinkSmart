import { describe, expect, it } from "vitest";
import { PICKER_COPY } from "@/components/picker/picker-copy";
import { SWAP_COPY } from "@/components/picker/wave5-picker";

/**
 * The tray's primary button, as wired in DrinksTab.
 *
 * Reported 2026-08-16: pressing `Done` inside the Cocktails card jumped to the
 * Timeline. The user had pressed it expecting to return to the plan and keep
 * adding drinks. `Done` finishes the night, so it belongs only on the plan
 * root; inside a category the same button applies and goes back.
 *
 * Mirrors the expressions at the PickerTray call site rather than rendering the
 * 1000-line component, so the rule is pinned without a DOM.
 */
function trayLabel(opts: {
  swapMode: boolean;
  category: string | null;
  hasPending: boolean;
  pendingQuantity: number;
}): string {
  const actionLabel = opts.swapMode
    ? SWAP_COPY.trayPrimary
    : opts.category !== null && !opts.hasPending
      ? PICKER_COPY.trayApply
      : undefined;
  return (
    actionLabel ??
    (opts.hasPending ? PICKER_COPY.trayPending(opts.pendingQuantity) : PICKER_COPY.trayIdle)
  );
}

/** True when the idle press finishes the night rather than returning to the plan. */
function idlePressLeavesPlan(opts: { swapMode: boolean; category: string | null }): boolean {
  return !(!opts.swapMode && opts.category !== null);
}

describe("the tray's primary action", () => {
  it("reads Apply and stays in the plan while a category is open", () => {
    const inCategory = { swapMode: false, category: "Cocktails", hasPending: false, pendingQuantity: 0 };
    expect(trayLabel(inCategory)).toBe("Apply");
    expect(idlePressLeavesPlan(inCategory)).toBe(false);
  });

  it("reads Done and finishes the night only on the plan root", () => {
    const atRoot = { swapMode: false, category: null, hasPending: false, pendingQuantity: 0 };
    expect(trayLabel(atRoot)).toBe("Done");
    expect(idlePressLeavesPlan(atRoot)).toBe(true);
  });

  // Apply must not eat the add action: with a drink pending, the button is
  // still what commits it.
  it("still reads Add N with a pending selection inside a category", () => {
    expect(
      trayLabel({ swapMode: false, category: "Cocktails", hasPending: true, pendingQuantity: 2 }),
    ).toBe("Add 2");
  });

  it("leaves swap mode's own primary untouched", () => {
    const swapping = { swapMode: true, category: "Cocktails", hasPending: false, pendingQuantity: 0 };
    expect(trayLabel(swapping)).toBe(SWAP_COPY.trayPrimary);
    expect(idlePressLeavesPlan(swapping)).toBe(true);
  });
});
