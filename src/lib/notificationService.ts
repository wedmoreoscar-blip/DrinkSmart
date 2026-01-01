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
    
    // Schedule new notifications
    await LocalNotifications.schedule({
      notifications: futureNotifications.map((notification, index) => {
        const unitText = notification.totalUnits > 1 
          ? ` (${notification.unitNumber}/${notification.totalUnits})`
          : '';
        
        return {
          id: index + 1, // IDs start at 1
          title: "Time to Drink! 🍻",
          body: `${notification.icon} ${notification.drinkName}${unitText}`,
          schedule: { at: notification.time },
          sound: 'default',
          smallIcon: 'ic_stat_icon_config_sample',
          largeIcon: 'ic_launcher',
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
 */
export const registerNotificationListeners = async (): Promise<void> => {
  if (!isNativePlatform()) {
    return;
  }
  
  try {
    await LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('Notification received:', notification);
    });
    
    await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      console.log('Notification action performed:', action);
    });
  } catch (error) {
    console.error('Error registering notification listeners:', error);
  }
};
