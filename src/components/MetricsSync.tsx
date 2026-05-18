import { useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { useUserMetrics } from "@/hooks/useUserMetrics";

/**
 * Pushes profile-backed metrics from `useUserMetrics` into the `AppContext` so
 * the BAC math engine has the latest values. Mounted once inside AppProvider.
 */
export const MetricsSync = () => {
  const { savedMetrics } = useUserMetrics();
  const { updateUserMetrics } = useAppContext();

  useEffect(() => {
    if (savedMetrics) {
      updateUserMetrics(savedMetrics);
    }
  }, [savedMetrics, updateUserMetrics]);

  return null;
};
