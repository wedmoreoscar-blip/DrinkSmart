import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock("./timeline-replan", () => ({ sortableIdFor: () => "vodka-1" }));

import { SortableTimelineItem } from "./SortableTimelineItem";

describe("Timeline absolute-volume copy", () => {
  it("shows absolute ml first and explicitly labelled ethanol second", () => {
    const html = renderToStaticMarkup(
      <SortableTimelineItem
        entry={{
          kind: "alcohol",
          entryId: "vodka:unit:1",
          drinkId: "vodka",
          drinkName: "25ml Absolut Vodka",
          unitNumber: 1,
          totalUnits: 6,
          time: new Date("2026-08-15T20:00:00Z"),
          pureAlcoholMl: 10,
          percentageOfTarget: 10,
          icon: "",
          unit: "ml",
        }}
        isPast={false}
        isCurrent={false}
        isDraggable
        isLocked={false}
        onToggleLock={() => {}}
        onSwapRequest={() => {}}
      />,
    );

    expect(html).toContain("25 ml · 10 ml ethanol · 1/6 portions");
    expect(html).not.toContain("ml alc");
  });
});
