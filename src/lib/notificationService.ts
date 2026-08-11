import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';
import type {
  AlcoholTimelineEntry,
  BreakTimelineEntry,
  TimelineEntry,
} from '@/lib/sessionEngine';

// Stable native action IDs and the single alcohol action type. Actions are
// matched by these IDs, never by their display labels.
export const DRINK_ACTION_TYPE_ID = 'drink-reminder-actions';
export const ACTION_HAD_IT = 'had-it';
export const ACTION_PLUS_15 = 'plus-15';

export type TimelineNotification = {
  entryId: string; // stable timeline entry id (we derive numeric IDs from this)
  title: string;
  body: string;
  time: Date;
  actionTypeId?: string;
  extra?: Record<string, string>;
};

export type NotificationActionHandler = (
  actionId: string,
  entryId: string,
  actionTime: Date
) => void;

// Listener reference counting so we don't double-register or accidentally remove
// listeners while another part of the app still relies on them.
let listenerRefCount = 0;
let listenerHandles: PluginListenerHandle[] = [];

// The action type is registered once per app lifetime; re-registering is
// unnecessary and would only risk reordering on platforms that re-apply it.
let actionTypesRegistered = false;

/**
 * Check if running on a native platform (iOS/Android)
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Check current notification permissions
 */
export const checkNotificationPermissions = async (): Promise<PermissionStatus | null> => {
  if (!isNativePlatform()) return null;

  try {
    return await LocalNotifications.checkPermissions();
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return null;
  }
};

/**
 * Request notification permissions from the user
 */
export const requestNotificationPermissions = async (): Promise<PermissionStatus | null> => {
  if (!isNativePlatform()) return null;

  try {
    return await LocalNotifications.requestPermissions();
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return null;
  }
};

/**
 * Cancel all pending drink notifications
 */
export const cancelAllDrinkNotifications = async (): Promise<void> => {
  if (!isNativePlatform()) return;

  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
};

/**
 * Generate a stable numeric ID from a string.
 * Capacitor LocalNotifications requires numeric IDs.
 */
const generateStableId = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // 32-bit
  }

  // Ensure positive, non-zero, within signed 32-bit range
  return (Math.abs(hash) % 2147483646) + 1;
};

const ORDINAL_WORDS: Record<number, string> = {
  1: 'First',
  2: 'Second',
  3: 'Third',
  4: 'Fourth',
  5: 'Fifth',
  6: 'Sixth',
  7: 'Seventh',
  8: 'Eighth',
  9: 'Ninth',
  10: 'Tenth',
  11: 'Eleventh',
  12: 'Twelfth',
  13: 'Thirteenth',
  14: 'Fourteenth',
  15: 'Fifteenth',
  16: 'Sixteenth',
  17: 'Seventeenth',
  18: 'Eighteenth',
  19: 'Nineteenth',
  20: 'Twentieth',
};

const ordinalWord = (n: number): string => ORDINAL_WORDS[n] ?? `${n}th`;

/** 24-hour HH:MM clock, deterministic regardless of locale */
const formatHHMM = (date: Date): string =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const buildAlcoholNotification = (
  entry: AlcoholTimelineEntry,
  drinkNumber: number,
  drinkCount: number
): TimelineNotification => {
  const volumeMatch = entry.drinkName.match(/^(\d+(?:\.\d+)?)(ml|oz)\s+(.+)$/);
  const title = volumeMatch
    ? `${volumeMatch[3]}, ${volumeMatch[1]} ${volumeMatch[2]}`
    : entry.drinkName;

  return {
    entryId: entry.entryId,
    title,
    body: `Due ${formatHHMM(entry.time)}. ${ordinalWord(drinkNumber)} of ${drinkCount}.`,
    time: entry.time,
    actionTypeId: DRINK_ACTION_TYPE_ID,
    extra: { entryId: entry.entryId },
  };
};

const buildBreakNotification = (entry: BreakTimelineEntry): TimelineNotification => {
  const breakEnd = new Date(entry.time.getTime() + entry.durationMinutes * 60000);

  return {
    entryId: entry.entryId,
    title: typeof entry.volumeMl === 'number' ? `Water, ${entry.volumeMl} ml` : entry.drinkName,
    body: `Break until ${formatHHMM(breakEnd)}.`,
    time: entry.time,
  };
};

/**
 * Convert a session timeline into one reminder per entry, keyed by the stable
 * entryId. Alcohol entries carry the drink action type and their session
 * ordinal ("Second of five."); break entries are the quiet copy-only variant.
 */
export const buildTimelineNotifications = (timeline: TimelineEntry[]): TimelineNotification[] => {
  const alcoholEntries = timeline.filter((entry): entry is AlcoholTimelineEntry => {
    return entry.kind === 'alcohol';
  });

  return timeline.map((entry) =>
    entry.kind === 'alcohol'
      ? buildAlcoholNotification(entry, alcoholEntries.indexOf(entry) + 1, alcoholEntries.length)
      : buildBreakNotification(entry)
  );
};

/**
 * Schedule timeline reminders for all future entries, replacing any prior
 * pending reminders. Registers the drink action type once before scheduling.
 */
export const scheduleTimelineNotifications = async (timeline: TimelineEntry[]): Promise<boolean> => {
  if (!isNativePlatform()) {
    console.log('Not on native platform, skipping notifications');
    return false;
  }

  try {
    const permission = await checkNotificationPermissions();
    if (permission?.display !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    // Cancel existing notifications first
    await cancelAllDrinkNotifications();

    const now = new Date();
    const futureNotifications = buildTimelineNotifications(timeline).filter((n) => n.time > now);

    if (futureNotifications.length === 0) {
      console.log('No future notifications to schedule');
      return true;
    }

    if (!actionTypesRegistered) {
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: DRINK_ACTION_TYPE_ID,
            actions: [
              { id: ACTION_HAD_IT, title: 'Had it', foreground: false },
              { id: ACTION_PLUS_15, title: '+15 min', foreground: false },
            ],
          },
        ],
      });
      actionTypesRegistered = true;
    }

    await LocalNotifications.schedule({
      notifications: futureNotifications.map((n) => ({
        id: generateStableId(n.entryId),
        title: n.title,
        body: n.body,
        schedule: { at: n.time },
        sound: 'default',
        // Avoid custom Android icon refs that may not exist in the native project.
        ...(n.actionTypeId
          ? { actionTypeId: n.actionTypeId, extra: n.extra ?? { entryId: n.entryId } }
          : {}),
      })),
    });

    console.log(`Scheduled ${futureNotifications.length} timeline notifications`);
    return true;
  } catch (error) {
    console.error('Error scheduling notifications:', error);
    return false;
  }
};

/**
 * Register notification action listeners.
 * Only the two known action IDs with a valid string entryId are dispatched to
 * the handler. Returns a cleanup function.
 */
export const registerNotificationListeners = async (
  onActionPerformed?: NotificationActionHandler
): Promise<() => void> => {
  if (!isNativePlatform()) return () => {};

  listenerRefCount += 1;

  // Already registered by another consumer; just decrement on cleanup.
  if (listenerRefCount > 1) {
    return () => {
      listenerRefCount = Math.max(0, listenerRefCount - 1);
    };
  }

  try {
    const receivedHandle = await LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('Notification received:', notification);
    });

    const actionHandle = await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const { actionId, notification } = action;
      const entryId = notification.extra?.entryId;
      if (
        (actionId === ACTION_HAD_IT || actionId === ACTION_PLUS_15) &&
        typeof entryId === 'string' &&
        entryId.length > 0
      ) {
        const actionTime = notification.schedule?.at
          ? new Date(notification.schedule.at)
          : new Date();
        onActionPerformed?.(actionId, entryId, actionTime);
      }
    });

    listenerHandles = [receivedHandle, actionHandle];

    return () => {
      listenerRefCount = Math.max(0, listenerRefCount - 1);
      if (listenerRefCount === 0) {
        listenerHandles.forEach((h) => h.remove());
        listenerHandles = [];
      }
    };
  } catch (error) {
    console.error('Error registering notification listeners:', error);
    listenerRefCount = Math.max(0, listenerRefCount - 1);
    return () => {};
  }
};
