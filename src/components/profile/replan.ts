import { getBACForLevel } from "@/data/buzzLevels";
import {
  calculateSessionTimeline,
  rescheduleTimeline,
  type TimelineEntry,
} from "@/lib/sessionEngine";
import { loadSession } from "@/lib/sessionStore";
import type { UserMetricsData } from "@/hooks/useUserMetrics";

function timeDeltaHours(start: Date | null, target: Date | null): number | null {
  if (!start || !target) return null;
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const targetMinutes = target.getHours() * 60 + target.getMinutes();
  const diff =
    targetMinutes <= startMinutes
      ? 24 * 60 - startMinutes + targetMinutes
      : targetMinutes - startMinutes;
  return diff / 60;
}

function buildTimeline(metrics: UserMetricsData, now: Date): TimelineEntry[] | null {
  const session = loadSession();
  if (!session) return null;
  const delta = timeDeltaHours(session.drinkingStartTime, session.drinkingTargetTime);
  if (delta === null || !session.drinkingStartTime) return null;

  const bac = getBACForLevel(session.inebriationLevel);
  const base = calculateSessionTimeline({
    entries: [
      ...session.drinks,
      ...session.breaks.map((breakEntry) => ({ kind: "break" as const, ...breakEntry })),
    ],
    userMetrics: metrics,
    targetBAC: { min: bac.min_bac, max: bac.max_bac },
    timeDeltaHours: delta,
    drinkingStartTime: session.drinkingStartTime,
  });

  const rescheduled = rescheduleTimeline({
    timeline: base.drinkTimeline,
    consumed: session.consumedTimelineEntries,
    delayedMinutes: session.delayedEntryMinutes,
    now,
    targetEndTime: session.drinkingTargetTime,
  });

  return rescheduled.timeline;
}

/**
 * Count how many alcohol entries would change time if the session timeline
 * were re-run with `after` instead of `before`. Returns null when no plan
 * exists yet, so the caller can fall back to a plain save confirmation.
 */
export function countMovedDrinks(
  before: UserMetricsData,
  after: UserMetricsData,
  now: Date = new Date()
): number | null {
  const beforeTimeline = buildTimeline(before, now);
  const afterTimeline = buildTimeline(after, now);
  if (!beforeTimeline || !afterTimeline) return null;

  const afterTimes = new Map(
    afterTimeline
      .filter((entry) => entry.kind === "alcohol")
      .map((entry) => [entry.entryId, entry.time.getTime()])
  );
  return beforeTimeline.filter(
    (entry) => entry.kind === "alcohol" && afterTimes.get(entry.entryId) !== entry.time.getTime()
  ).length;
}
