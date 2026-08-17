import { describe, expect, it } from "vitest";
import { timelineDropIndex, timelineDropLineY } from "./timeline-drag";

// Oscar, 2026-08-17: dragging a drink down swapped the row below it up, and
// then releasing sprang the dragged row back where it started. The preview was
// dnd-kit's (arrayMove to `overIndex`, drawn as soon as `closestCorners` names
// a neighbour); the commit was a midpoint test that had not fired yet. Every
// case below is really the one assertion that those are now a single rule.
describe("timelineDropIndex", () => {
  it("lands the row where the preview put it, on overlap and not on midpoint", () => {
    // The drag that used to revert: over the neighbour, midpoint not yet past.
    expect(timelineDropIndex({ fromIndex: 2, overIndex: 3, firstMovableIndex: 0 })).toBe(3);
    expect(timelineDropIndex({ fromIndex: 3, overIndex: 2, firstMovableIndex: 0 })).toBe(2);
  });

  it("carries a row across several rows in one drag", () => {
    expect(timelineDropIndex({ fromIndex: 1, overIndex: 5, firstMovableIndex: 0 })).toBe(5);
    expect(timelineDropIndex({ fromIndex: 5, overIndex: 1, firstMovableIndex: 0 })).toBe(1);
  });

  it("refuses a drop onto a row that is already in the past", () => {
    expect(timelineDropIndex({ fromIndex: 4, overIndex: 1, firstMovableIndex: 3 })).toBeNull();
    expect(timelineDropIndex({ fromIndex: 4, overIndex: 3, firstMovableIndex: 3 })).toBe(3);
  });

  it("refuses a drop that changes nothing, or onto a row it cannot find", () => {
    expect(timelineDropIndex({ fromIndex: 2, overIndex: 2, firstMovableIndex: 0 })).toBeNull();
    expect(timelineDropIndex({ fromIndex: -1, overIndex: 2, firstMovableIndex: 0 })).toBeNull();
    expect(timelineDropIndex({ fromIndex: 2, overIndex: -1, firstMovableIndex: 0 })).toBeNull();
  });
});

describe("timelineDropLineY", () => {
  // The line marks the slot the preview has just vacated, so it agrees with the
  // rows the user can see moving rather than with a separate midpoint test.
  it("sits under the row being passed on the way down", () => {
    expect(timelineDropLineY({ fromIndex: 2, overIndex: 3, rowTop: 300, rowHeight: 74 })).toBe(374);
  });

  it("sits above the row being passed on the way up", () => {
    expect(timelineDropLineY({ fromIndex: 3, overIndex: 2, rowTop: 220, rowHeight: 74 })).toBe(220);
  });
});
