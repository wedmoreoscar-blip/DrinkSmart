import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/AppContext", () => ({
  useAppContext: () => ({
    markTimelineEntryHadIt: vi.fn(),
    delayTimelineEntry: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({ toast: vi.fn() }));

import { isReminderDue } from "@/hooks/useWebDrinkReminders";

describe("web reminder timing", () => {
  it("never becomes due before the exact scheduled time", () => {
    expect(isReminderDue(9_999, 10_000)).toBe(false);
    expect(isReminderDue(10_000, 10_000)).toBe(true);
  });

  it("allows one polling interval of lateness but not stale reminders", () => {
    expect(isReminderDue(11_499, 10_000)).toBe(true);
    expect(isReminderDue(11_500, 10_000)).toBe(false);
  });
});
