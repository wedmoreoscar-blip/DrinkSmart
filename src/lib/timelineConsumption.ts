import {
  markEntryConsumed,
  type ConsumedSnapshot,
  type TimelineEntry,
} from "@/lib/sessionEngine";

export function recordTimelineConsumption<
  T extends { drinkTimeline: TimelineEntry[]; consumedTimelineEntries: ConsumedSnapshot[] }
>(state: T, entryId: string, consumedAt: Date): T {
  const consumedTimelineEntries = markEntryConsumed(
    state.drinkTimeline,
    state.consumedTimelineEntries,
    entryId,
    consumedAt,
  );
  return consumedTimelineEntries === state.consumedTimelineEntries
    ? state
    : { ...state, consumedTimelineEntries };
}
