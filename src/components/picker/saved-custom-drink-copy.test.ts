import { describe, expect, it } from "vitest";

import { CUSTOM_COPY } from "./picker-copy";

describe("saved custom drink selector copy", () => {
  it("shows ABV and the reusable absolute serving when one is saved", () => {
    expect(CUSTOM_COPY.savedRow(5.6, 330)).toBe("5.6% · 330 ml");
  });

  it("makes a legacy missing serve explicit instead of inventing one", () => {
    expect(CUSTOM_COPY.savedRow(13, null)).toBe("13.0% · serve not saved");
  });
});
