import { describe, expect, it } from "vitest";

import { planFlowReducer, type PlanFlowState } from "./plan-navigation";

const initial: PlanFlowState = {
  screen: "picker",
  selectedVenueId: null,
  scannerTask: "idle",
};

describe("Wave 4 PlanTab navigation", () => {
  it("routes picker to establishments, selection back to picker, and scan into scanner", () => {
    expect(planFlowReducer(initial, { type: "open-venues" }).screen).toBe("establishments");
    expect(
      planFlowReducer({ ...initial, screen: "establishments" }, { type: "select-venue", id: "venue-2" }),
    ).toEqual({ ...initial, selectedVenueId: "venue-2" });
    expect(
      planFlowReducer({ ...initial, screen: "establishments" }, { type: "open-scanner" }).screen,
    ).toBe("scanner");
  });

  it("keeps an active scanner task mounted when waiting returns to the picker", () => {
    const parsing: PlanFlowState = { ...initial, screen: "scanner", scannerTask: "parsing" };
    const planning = planFlowReducer(parsing, { type: "keep-planning" });

    expect(planning).toEqual({ ...parsing, screen: "picker" });
    expect(planFlowReducer(planning, { type: "check-scan" }).screen).toBe("scanner");
  });
});
