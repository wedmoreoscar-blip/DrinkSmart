import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PreferencesPicker } from "./PreferencesPicker";

describe("onboarding taste rails", () => {
  it("gives Sweetness and Strength identical fixed endpoint columns", () => {
    const html = renderToStaticMarkup(<PreferencesPicker />);
    const alignedRailClass = "grid-cols-[72px_minmax(0,1fr)_72px]";

    expect(html.split(alignedRailClass)).toHaveLength(3);
  });
});
