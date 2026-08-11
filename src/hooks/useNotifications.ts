import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isNativePlatform,
  checkNotificationPermissions,
  requestNotificationPermissions,
  scheduleTimelineNotifications,
  cancelAllDrinkNotifications,
  registerNotificationListeners,
  ACTION_HAD_IT,
  ACTION_PLUS_15,
} from '@/lib/notificationService';
import type { TimelineEntry } from '@/lib/sessionEngine';
import { useAppContext } from '@/contexts/AppContext';

type PermissionState = 'unknown' | 'granted' | 'denied' | 'prompt' | 'not-available';

const NOTIFICATIONS_STORAGE_KEY = 'drink-notifications-enabled';

const safeStorageGet = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeStorageSet = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore (e.g., storage disabled)
  }
};

export const useNotifications = () => {
  const { markTimelineEntryHadIt, delayTimelineEntry } = useAppContext();
  const [isNative, setIsNative] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const callbacksRef = useRef({ markTimelineEntryHadIt, delayTimelineEntry });

  // Keep the latest AppContext callbacks for the long-lived native listener
  // without re-registering it on every render.
  useEffect(() => {
    callbacksRef.current = { markTimelineEntryHadIt, delayTimelineEntry };
  }, [markTimelineEntryHadIt, delayTimelineEntry]);

  // Check platform and permissions on mount
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const native = isNativePlatform();
      if (cancelled) return;
      setIsNative(native);

      if (!native) {
        setPermissionStatus('not-available');
        return;
      }

      // Register listeners (handle fast unmount race)
      const cleanup = await registerNotificationListeners((actionId, entryId, actionTime) => {
        const callbacks = callbacksRef.current;
        if (actionId === ACTION_HAD_IT) {
          callbacks.markTimelineEntryHadIt(entryId, actionTime);
        } else if (actionId === ACTION_PLUS_15) {
          callbacks.delayTimelineEntry(entryId, 15);
        }
      });
      if (cancelled) {
        cleanup();
        return;
      }
      cleanupRef.current = cleanup;

      // Check current permission status
      const status = await checkNotificationPermissions();
      if (cancelled) return;

      if (status) {
        const displayStatus = status.display as PermissionState;
        setPermissionStatus(displayStatus);

        // Only enable notifications if permissions are granted AND user previously enabled them.
        const userPreviouslyEnabled = safeStorageGet(NOTIFICATIONS_STORAGE_KEY) === 'true';
        if (displayStatus === 'granted' && userPreviouslyEnabled) {
          setNotificationsEnabled(true);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // Request permissions
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;

    setIsLoading(true);
    try {
      const status = await requestNotificationPermissions();
      if (!status) return false;

      setPermissionStatus(status.display as PermissionState);
      const granted = status.display === 'granted';

      if (granted) {
        setNotificationsEnabled(true);
        safeStorageSet(NOTIFICATIONS_STORAGE_KEY, 'true');
      }

      return granted;
    } finally {
      setIsLoading(false);
    }
  }, [isNative]);

  // Schedule notifications from timeline
  const scheduleFromTimeline = useCallback(
    async (timeline: TimelineEntry[]): Promise<boolean> => {
      if (!isNative || !notificationsEnabled) return false;

      return scheduleTimelineNotifications(timeline);
    },
    [isNative, notificationsEnabled]
  );

  // Cancel all notifications
  const cancelAll = useCallback(async (): Promise<void> => {
    if (!isNative) return;
    await cancelAllDrinkNotifications();
  }, [isNative]);

  // Toggle notifications
  const toggleNotifications = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (enabled) {
        if (permissionStatus !== 'granted') {
          const granted = await requestPermission();
          if (!granted) return false;
          return true;
        }

        setNotificationsEnabled(true);
        safeStorageSet(NOTIFICATIONS_STORAGE_KEY, 'true');
        return true;
      }

      await cancelAll();
      setNotificationsEnabled(false);
      safeStorageSet(NOTIFICATIONS_STORAGE_KEY, 'false');
      return true;
    },
    [permissionStatus, requestPermission, cancelAll]
  );

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
