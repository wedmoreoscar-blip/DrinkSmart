export type PlanFlowScreen = "picker" | "establishments" | "scanner";
export type ScannerTaskState = "idle" | "active" | "parsing" | "ready" | "failed";

export type PlanFlowState = {
  screen: PlanFlowScreen;
  selectedVenueId: string | null;
  scannerTask: ScannerTaskState;
};

export type PlanFlowAction =
  | { type: "open-venues" }
  | { type: "select-venue"; id: string }
  | { type: "open-scanner" }
  | { type: "scanner-task"; task: Exclude<ScannerTaskState, "idle"> }
  | { type: "keep-planning" }
  | { type: "check-scan" }
  | { type: "back-to-venues" }
  | { type: "finish-scanner" };

export const planFlowReducer = (state: PlanFlowState, action: PlanFlowAction): PlanFlowState => {
  switch (action.type) {
    case "open-venues":
      return { ...state, screen: "establishments" };
    case "select-venue":
      return { screen: "picker", selectedVenueId: action.id, scannerTask: "idle" };
    case "open-scanner":
      return { ...state, screen: "scanner", scannerTask: "active" };
    case "scanner-task":
      return { ...state, scannerTask: action.task };
    case "keep-planning":
      return { ...state, screen: "picker" };
    case "check-scan":
      return state.scannerTask === "idle" ? state : { ...state, screen: "scanner" };
    case "back-to-venues":
      return { ...state, screen: "establishments", scannerTask: "idle" };
    case "finish-scanner":
      return { ...state, screen: "picker", scannerTask: "idle" };
  }
};
