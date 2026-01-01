import { Capacitor } from '@capacitor/core';
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';

export type DrinkNotification = {
  id: string;
  drinkName: string;
  time: Date;
  icon: string;
  unitNumber: number;
  totalUnits: number;
};

// Track if listeners have been registered to prevent duplicates
let listenersRegistered = false;

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
  if (!isNativePlatform()) {
    return null;
  }
  
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
  if (!isNativePlatform()) {
    return null;
  }
  
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
  if (!isNativePlatform()) {
    return;
  }
  
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map(n => ({ id: n.id }))
      });
    }
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
};

/**
 * Generate a stable numeric ID from a string
 * Uses a simple hash function to create consistent IDs
 */
const generateStableId = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Ensure positive ID between 1 and 2147483647 (max 32-bit signed int)
  return Math.abs(hash % 2147483646) + 1;
};

/**
 * Schedule drink notifications for all future timeline entries
 */
export const scheduleDrinkNotifications = async (
  notifications: DrinkNotification[]
): Promise<boolean> => {
  if (!isNativePlatform()) {
    console.log('Not on native platform, skipping notifications');
    return false;
  }
  
  try {
    // First check permissions
    const permission = await checkNotificationPermissions();
    if (permission?.display !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }
    
    // Cancel existing notifications first
    await cancelAllDrinkNotifications();
    
    // Filter to only future notifications
    const now = new Date();
    const futureNotifications = notifications.filter(n => n.time > now);
    
    if (futureNotifications.length === 0) {
      console.log('No future notifications to schedule');
      return true;
    }
    
    // Schedule new notifications with stable IDs
    await LocalNotifications.schedule({
      notifications: futureNotifications.map((notification) => {
        const unitText = notification.totalUnits > 1 
          ? ` (${notification.unitNumber}/${notification.totalUnits})`
          : '';
        
        // Generate stable ID from drinkId + unitNumber
        const stableId = generateStableId(`${notification.id}`);
        
        return {
          id: stableId,
          title: "Time to Drink! 🍻",
          body: `${notification.icon} ${notification.drinkName}${unitText}`,
          schedule: { at: notification.time },
          sound: 'default',
          // Use undefined to let the system use defaults
          // This avoids referencing icons that may not exist
        };
      })
    });
    
    console.log(`Scheduled ${futureNotifications.length} drink notifications`);
    return true;
  } catch (error) {
    console.error('Error scheduling notifications:', error);
    return false;
  }
};

/**
 * Register notification action listeners
 * Returns a cleanup function to remove listeners
 */
export const registerNotificationListeners = async (): Promise<() => void> => {
  if (!isNativePlatform()) {
    return () => {};
  }
  
  // Prevent duplicate listener registration
  if (listenersRegistered) {
    return () => {};
  }
  
  try {
    await LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('Notification received:', notification);
    });
    
    await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      console.log('Notification action performed:', action);
    });
    
    listenersRegistered = true;
    
    // Return cleanup function
    return () => {
      LocalNotifications.removeAllListeners();
      listenersRegistered = false;
    };
  } catch (error) {
    console.error('Error registering notification listeners:', error);
    return () => {};
  }
};
