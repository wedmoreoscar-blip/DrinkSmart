import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const phaseMock = vi.hoisted(() => vi.fn(() => "winding-down"));
const windDownProps = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }));
const sortableProps = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }));
const timeline = vi.hoisted(() => [
  {
    kind: "alcohol" as const,
    entryId: "lager:unit:1",
    drinkId: "lager",
    drinkName: "25ml Lager",
    unitNumber: 1,
    totalUnits: 1,
    time: new Date(Date.now() + 3_600_000),
    pureAlcoholMl: 10,
    percentageOfTarget: 25,
    icon: "",
    unit: "ml",
    intervalMinutes: 30,
  },
]);
const consumed = vi.hoisted(() => []);
const effectiveEnd = vi.hoisted(() => new Date(2026, 7, 15, 23, 15));
const endSessionMock = vi.hoisted(() => vi.fn());
const cancelAllMock = vi.hoisted(() => vi.fn());
const saveSessionSnapshotMock = vi.hoisted(() => vi.fn(async () => true));

vi.mock("@/contexts/AppContext", () => ({
  useAppContext: () => ({
    state: {
      drinkTimeline: timeline,
      consumedTimelineEntries: consumed,
      effectivePlanEndTime: effectiveEnd,
      drinkingStartTime: new Date(2026, 7, 15, 19, 0),
      drinkingTargetTime: new Date(2026, 7, 15, 23, 0),
      timeDelta: 4,
      inebriationLevel: 4,
      drinks: [{ id: "lager", category: "Beer & cider", drink: "Lager", quantity: "25", unit: "ml" }],
      lockedDrinkIds: [],
      delayedEntryMinutes: {},
    },
    reorderTimelineEntries: vi.fn(),
    toggleLockedDrink: vi.fn(),
    markTimelineEntryHadIt: vi.fn(),
    delayTimelineEntry: vi.fn(),
    applyRegeneratedRemainingDrinks: vi.fn(),
    endSession: endSessionMock,
  }),
}));

vi.mock("@/hooks/useSessionHistory", () => ({
  useSessionHistory: () => ({
    isAccount: true,
    saveSessionSnapshot: saveSessionSnapshotMock,
  }),
}));

vi.mock("@/lib/sessionEngine", () => ({ deriveSessionPhase: phaseMock }));
vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    isNative: false,
    notificationsEnabled: false,
    isLoading: false,
    toggleNotifications: vi.fn(),
    scheduleFromTimeline: vi.fn(),
    cancelAll: cancelAllMock,
  }),
}));
vi.mock("@/hooks/useWebDrinkReminders", () => ({ useWebDrinkReminders: vi.fn() }));
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => children,
  closestCenter: vi.fn(),
  KeyboardSensor: class {},
  PointerSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => children,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: {},
}));
vi.mock("@/components/tabs/WindDownScreen", () => ({
  default: (props: Record<string, unknown>) => {
    windDownProps.current = props;
    return React.createElement("div", null, "wind-down-marker");
  },
}));
vi.mock("@/components/tabs/SortableTimelineItem", () => ({
  SortableTimelineItem: (props: Record<string, unknown>) => {
    sortableProps.current = props;
    return React.createElement("div", null, "timeline-row");
  },
}));

import TimelineTab from "@/components/tabs/TimelineTab";

describe("TimelineTab wind-down routing", () => {
  it("saves the live account snapshot before ending and exiting", async () => {
    const onNext = vi.fn();
    const html = renderToStaticMarkup(<TimelineTab onNext={onNext} />);

    expect(html).toContain("wind-down-marker");
    expect(phaseMock).toHaveBeenCalledWith(timeline, consumed, effectiveEnd, expect.any(Date));
    expect(windDownProps.current?.currentTime).toEqual(expect.any(Date));

    const endSession = windDownProps.current?.onNext as (() => Promise<void>) | undefined;
    await endSession?.();

    expect(saveSessionSnapshotMock).toHaveBeenCalledWith({
      duration_minutes: 240,
      buzz_level: 4,
      drinks: [expect.objectContaining({ id: "lager", drink: "Lager" })],
    });
    expect(saveSessionSnapshotMock.mock.invocationCallOrder[0]).toBeLessThan(
      endSessionMock.mock.invocationCallOrder[0],
    );
    expect(endSessionMock).toHaveBeenCalledWith(expect.any(Date));
    expect(cancelAllMock).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("keeps reminders out of the timeline and exposes the settled hero actions", () => {
    phaseMock.mockReturnValueOnce("active");
    const html = renderToStaticMarkup(<TimelineTab onNext={vi.fn()} />);

    expect(html).not.toContain(">Next</div>");
    expect(html).toContain(">Had it</button>");
    expect(html).toContain(">+15</button>");
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>Had it<\/button>/);
    expect(html.indexOf("Plan ends")).toBeLessThan(html.indexOf("Drink Reminders"));
    expect(html.indexOf("Drink Reminders")).toBeLessThan(html.indexOf("Re-plan the rest"));
    expect(html).toContain("25 ml · 10 ml ethanol");
    expect(html).toContain("23:15");
    expect(html).not.toContain("23:00");
  });

  it("keeps an overdue unconsumed drink selected and out of the past state", () => {
    const originalTime = timeline[0].time;
    timeline[0].time = new Date(Date.now() - 60_000);
    phaseMock.mockReturnValueOnce("active");

    const html = renderToStaticMarkup(<TimelineTab onNext={vi.fn()} />);

    expect(html).toContain("Lager");
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>Had it<\/button>/);
    expect(sortableProps.current?.isCurrent).toBe(true);
    expect(sortableProps.current?.isPast).toBe(false);
    timeline[0].time = originalTime;
  });
});
