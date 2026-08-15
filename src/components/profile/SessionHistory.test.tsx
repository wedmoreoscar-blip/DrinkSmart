import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const historyState = vi.hoisted(() => ({
  isAccount: true,
  loading: false,
  sessions: [
    {
      id: "12345678-aaaa-bbbb-cccc-123456789012",
      user_id: "account-id",
      duration_minutes: 180,
      buzz_level: 4,
      completed_at: "2026-08-15T22:00:00Z",
      drinks: [
        {
          id: "saved-drink",
          category: "Beer & cider",
          drink: "Lager",
          quantity: "1136",
          unit: "ml" as const,
          portions: 2,
        },
      ],
    },
  ],
}));

vi.mock("@/hooks/useSessionHistory", () => ({
  useSessionHistory: () => historyState,
}));

vi.mock("@/contexts/AppContext", () => ({
  useAppContext: () => ({ loadSessionSnapshot: vi.fn() }),
}));

import { SessionHistory } from "@/components/profile/SessionHistory";

describe("SessionHistory", () => {
  it("shows compact reusable account snapshots with their UUID and drink quantities", () => {
    const html = renderToStaticMarkup(<SessionHistory />);

    expect(html).toContain("Session history");
    expect(html).toContain("12345678");
    expect(html).toContain("Buzz 4 · 3h");
    expect(html).toContain("2 × 568 ml Lager");
    expect(html).toContain("<button");
  });

  it("does not expose account history to an anonymous user", () => {
    historyState.isAccount = false;
    expect(renderToStaticMarkup(<SessionHistory />)).toBe("");
    historyState.isAccount = true;
  });
});
