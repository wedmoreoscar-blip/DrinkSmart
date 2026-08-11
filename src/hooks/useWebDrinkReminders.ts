import { useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useAppContext } from '@/contexts/AppContext';
import { buildTimelineNotifications } from '@/lib/notificationService';
import type { TimelineEntry } from '@/lib/sessionEngine';

const REMINDER_WINDOW_MS = 1500;

export const isReminderDue = (nowMs: number, scheduledMs: number): boolean => {
  const elapsedMs = nowMs - scheduledMs;
  return elapsedMs >= 0 && elapsedMs < REMINDER_WINDOW_MS;
};

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
      if (
        isReminderDue(now.getTime(), entryTime) &&
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
            classNames: {
              cancelButton:
                '!bg-transparent !text-primary-hover font-medium px-4 flex-1',
              actionButton:
                '!bg-transparent !text-foreground font-normal px-4 flex-1 border-l border-border',
            },
            cancelButtonStyle: {
              height: 'auto',
              minHeight: '60px',
              fontSize: '19px',
              fontWeight: 500,
              color: '#b5abfc',
            },
            actionButtonStyle: {
              height: 'auto',
              minHeight: '60px',
              fontSize: '19px',
              fontWeight: 400,
              color: '#e9e9ed',
              borderLeft: '1px solid #383a46',
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
