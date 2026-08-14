import { describe, expect, it } from "vitest";
import { PLAN_BUILT_COPY, overTargetAdvice } from "./wave5-picker";

describe("Wave 5 picker boundaries", () => {
  it("never exposes the rejected Start tray action", () => {
    expect(PLAN_BUILT_COPY.trayPrimary).toBe("Done");
  });

  it("shows higher-band advice only inside the red interval, with ordered boundaries", () => {
    expect(overTargetAdvice(114.99, 100, 3)).toBeNull();
    expect(overTargetAdvice(115, 100, 3)).toContain("Loose");
    expect(overTargetAdvice(120, 100, 3)).toContain("Loose");
    expect(overTargetAdvice(120.01, 100, 3)).toBeNull();
    expect(overTargetAdvice(119, 100, 7)).toBeNull();
  });
});
