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
const effectiveEnd = vi.hoisted(() => new Date(Date.now() - 1_000));

vi.mock("@/contexts/AppContext", () => ({
  useAppContext: () => ({
    state: {
      drinkTimeline: timeline,
      consumedTimelineEntries: consumed,
      effectivePlanEndTime: effectiveEnd,
      drinkingStartTime: new Date(),
      drinkingTargetTime: new Date(Date.now() + 7_200_000),
      drinks: [],
      lockedDrinkIds: [],
    },
    reorderTimelineEntries: vi.fn(),
    toggleLockedDrink: vi.fn(),
    markTimelineEntryHadIt: vi.fn(),
    delayTimelineEntry: vi.fn(),
    applyRegeneratedRemainingDrinks: vi.fn(),
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
  it("uses the authoritative phase inputs and forwards the existing exit callback", () => {
    const onNext = vi.fn();
    const html = renderToStaticMarkup(<TimelineTab onNext={onNext} />);

    expect(html).toContain("wind-down-marker");
    expect(phaseMock).toHaveBeenCalledWith(timeline, consumed, effectiveEnd, expect.any(Date));
    expect(windDownProps.current?.onNext).toBe(onNext);
    expect(windDownProps.current?.currentTime).toEqual(expect.any(Date));
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
