import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';

export type DrinkNotification = {
  id: string; // stable string identifier (we derive numeric IDs from this)
  drinkName: string;
  time: Date;
  icon: string;
  unitNumber: number;
  totalUnits: number;
};

// Listener reference counting so we don't double-register or accidentally remove
// listeners while another part of the app still relies on them.
let listenerRefCount = 0;
let listenerHandles: PluginListenerHandle[] = [];

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

/**
 * Schedule drink notifications for all future timeline entries
 */
export const scheduleDrinkNotifications = async (notifications: DrinkNotification[]): Promise<boolean> => {
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
    const futureNotifications = notifications.filter((n) => n.time > now);

    if (futureNotifications.length === 0) {
      console.log('No future notifications to schedule');
      return true;
    }

    await LocalNotifications.schedule({
      notifications: futureNotifications.map((n) => {
        const unitText = n.totalUnits > 1 ? ` (${n.unitNumber}/${n.totalUnits})` : '';

        return {
          id: generateStableId(n.id),
          title: 'Time to Drink! 🍻',
          body: `${n.icon} ${n.drinkName}${unitText}`,
          schedule: { at: n.time },
          sound: 'default',
          // Avoid custom Android icon refs that may not exist in the native project.
        };
      }),
    });

    console.log(`Scheduled ${futureNotifications.length} drink notifications`);
    return true;
  } catch (error) {
    console.error('Error scheduling notifications:', error);
    return false;
  }
};

/**
 * Register notification action listeners.
 * Returns a cleanup function.
 */
export const registerNotificationListeners = async (): Promise<() => void> => {
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
      console.log('Notification action performed:', action);
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
