import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

type TimelineEntry = {
  drinkId: string;
  drinkName: string;
  time: Date;
  icon: string;
  unitNumber: number;
  totalUnits: number;
};

/**
 * Hook to show toast notifications for drink reminders in the web browser.
 * Checks every second if any drink time has been reached and shows a toast.
 */
export const useWebDrinkReminders = (
  timeline: TimelineEntry[],
  enabled: boolean
) => {
  // Track which drink times have already been notified (by their timestamp)
  const notifiedTimesRef = useRef<Set<number>>(new Set());

  // Reset notified times when timeline changes significantly
  useEffect(() => {
    // Clear notifications if timeline is empty or completely different
    if (timeline.length === 0) {
      notifiedTimesRef.current.clear();
    }
  }, [timeline]);

  const checkAndNotify = useCallback(() => {
    if (!enabled || timeline.length === 0) return;

    const now = new Date();

    timeline.forEach((entry) => {
      const entryTime = entry.time.getTime();
      const timeDiff = now.getTime() - entryTime;

      // Check if this drink time has passed (within last 2 seconds) and hasn't been notified
      if (
        timeDiff >= 0 &&
        timeDiff < 2000 &&
        !notifiedTimesRef.current.has(entryTime)
      ) {
        notifiedTimesRef.current.add(entryTime);

        const unitText =
          entry.totalUnits > 1
            ? ` (${entry.unitNumber}/${entry.totalUnits})`
            : '';

        toast(`${entry.icon} Time to drink!`, {
          description: `${entry.drinkName}${unitText}`,
          duration: 10000,
          action: {
            label: 'Cheers! 🍻',
            onClick: () => {},
          },
        });
      }
    });
  }, [enabled, timeline]);

  // Check every second
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(checkAndNotify, 1000);
    // Also check immediately
    checkAndNotify();

    return () => clearInterval(interval);
  }, [enabled, checkAndNotify]);

  // Clear notified times when disabled
  useEffect(() => {
    if (!enabled) {
      notifiedTimesRef.current.clear();
    }
  }, [enabled]);
};
