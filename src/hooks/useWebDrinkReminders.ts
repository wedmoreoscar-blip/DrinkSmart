import { useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useAppContext } from '@/contexts/AppContext';
import { buildTimelineNotifications } from '@/lib/notificationService';
import type { TimelineEntry } from '@/lib/sessionEngine';

/**
 * Hook to show toast notifications for drink and break reminders in the web
 * browser. Checks every second if any timeline time has been reached and shows
 * a toast, deduplicating by the stable timeline entryId.
 */
export const useWebDrinkReminders = (
  timeline: TimelineEntry[],
  enabled: boolean
) => {
  const { markTimelineEntryHadIt, delayTimelineEntry } = useAppContext();

  // Track which timeline entries have already been notified (by entryId)
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Build the notification copy once per timeline, shared with the native
  // scheduling model so both surfaces say the same thing.
  const reminders = useMemo(() => buildTimelineNotifications(timeline), [timeline]);

  // Reset notified entries when timeline is empty or completely different
  useEffect(() => {
    if (timeline.length === 0) {
      notifiedIdsRef.current.clear();
    }
  }, [timeline]);

  const checkAndNotify = useCallback(() => {
    if (!enabled || reminders.length === 0) return;

    const now = new Date();

    reminders.forEach((reminder) => {
      const entryTime = reminder.time.getTime();
      const timeDiff = now.getTime() - entryTime;

      // Check if we're within the notification window (trigger early so the center of
      // the moving indicator aligns with the drink icon center when the toast appears)
      // We trigger 1500ms early to account for the visual positioning of the pulsing indicator
      const triggerOffset = 1500; // ms early
      if (
        timeDiff >= -triggerOffset &&
        timeDiff < 500 &&
        !notifiedIdsRef.current.has(reminder.entryId)
      ) {
        notifiedIdsRef.current.add(reminder.entryId);

        if (reminder.actionTypeId) {
          // Alcohol reminders carry the same two actions, in the same order:
          // "Had it" first (left), "+15 min" second (right).
          toast(reminder.title, {
            description: reminder.body,
            duration: 10000,
            cancel: {
              label: 'Had it',
              onClick: () => markTimelineEntryHadIt(reminder.entryId),
            },
            action: {
              label: '+15 min',
              onClick: () => delayTimelineEntry(reminder.entryId, 15),
            },
          });
        } else {
          // Break reminders are the quieter copy-only variant.
          toast(reminder.title, {
            description: reminder.body,
            duration: 10000,
          });
        }
      }
    });
  }, [enabled, reminders, markTimelineEntryHadIt, delayTimelineEntry]);

  // Check every second
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(checkAndNotify, 1000);
    // Also check immediately
    checkAndNotify();

    return () => clearInterval(interval);
  }, [enabled, checkAndNotify]);

  // Clear notified entries when disabled
  useEffect(() => {
    if (!enabled) {
      notifiedIdsRef.current.clear();
    }
  }, [enabled]);
};
