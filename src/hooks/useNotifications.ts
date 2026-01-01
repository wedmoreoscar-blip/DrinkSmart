import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isNativePlatform,
  checkNotificationPermissions,
  requestNotificationPermissions,
  scheduleDrinkNotifications,
  cancelAllDrinkNotifications,
  registerNotificationListeners,
  DrinkNotification,
} from '@/lib/notificationService';

type PermissionState = 'unknown' | 'granted' | 'denied' | 'prompt' | 'not-available';

const NOTIFICATIONS_STORAGE_KEY = 'drink-notifications-enabled';

export const useNotifications = () => {
  const [isNative, setIsNative] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Check platform and permissions on mount
  useEffect(() => {
    const init = async () => {
      const native = isNativePlatform();
      setIsNative(native);
      
      if (!native) {
        setPermissionStatus('not-available');
        return;
      }
      
      // Register listeners and store cleanup function
      const cleanup = await registerNotificationListeners();
      cleanupRef.current = cleanup;
      
      // Check current permission status
      const status = await checkNotificationPermissions();
      if (status) {
        const displayStatus = status.display as PermissionState;
        setPermissionStatus(displayStatus);
        
        // Only enable notifications if:
        // 1. Permissions are granted AND
        // 2. User previously enabled them (stored in localStorage)
        const storedPreference = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
        const userPreviouslyEnabled = storedPreference === 'true';
        
        if (displayStatus === 'granted' && userPreviouslyEnabled) {
          setNotificationsEnabled(true);
        }
      }
    };
    
    init();
    
    // Cleanup listeners on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // Request permissions
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      return false;
    }
    
    setIsLoading(true);
    try {
      const status = await requestNotificationPermissions();
      if (status) {
        setPermissionStatus(status.display as PermissionState);
        const granted = status.display === 'granted';
        if (granted) {
          setNotificationsEnabled(true);
          localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, 'true');
        }
        return granted;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isNative]);

  // Schedule notifications from timeline
  const scheduleFromTimeline = useCallback(async (
    timeline: Array<{
      drinkId: string;
      drinkName: string;
      time: Date;
      icon: string;
      unitNumber: number;
      totalUnits: number;
    }>
  ): Promise<boolean> => {
    if (!isNative || !notificationsEnabled) {
      return false;
    }
    
    const notifications: DrinkNotification[] = timeline.map(entry => ({
      id: `${entry.drinkId}-${entry.unitNumber}`,
      drinkName: entry.drinkName,
      time: entry.time,
      icon: entry.icon,
      unitNumber: entry.unitNumber,
      totalUnits: entry.totalUnits,
    }));
    
    return scheduleDrinkNotifications(notifications);
  }, [isNative, notificationsEnabled]);

  // Cancel all notifications
  const cancelAll = useCallback(async (): Promise<void> => {
    if (!isNative) {
      return;
    }
    await cancelAllDrinkNotifications();
  }, [isNative]);

  // Toggle notifications
  const toggleNotifications = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (enabled) {
      if (permissionStatus !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          return false;
        }
      } else {
        setNotificationsEnabled(true);
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, 'true');
      }
      return true;
    } else {
      await cancelAll();
      setNotificationsEnabled(false);
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, 'false');
      return true;
    }
  }, [permissionStatus, requestPermission, cancelAll]);

  return {
    isNative,
    permissionStatus,
    isLoading,
    notificationsEnabled,
    requestPermission,
    scheduleFromTimeline,
    cancelAll,
    toggleNotifications,
  };
};
