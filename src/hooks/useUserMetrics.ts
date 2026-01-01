import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type UserMetricsData = {
  metricType: "bmi" | "ffmi";
  heightUnit: "cm" | "ft";
  weightUnit: "kg" | "lbs";
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  bodyFat: string;
  age: string;
  sex: "male" | "female" | "";
};

const defaultMetrics: UserMetricsData = {
  metricType: "bmi",
  heightUnit: "cm",
  weightUnit: "kg",
  heightCm: "",
  heightFt: "",
  heightIn: "",
  weight: "",
  bodyFat: "",
  age: "",
  sex: "",
};

export const useUserMetrics = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedMetrics, setSavedMetrics] = useState<UserMetricsData | null>(null);
  const { toast } = useToast();

  // Check auth state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch saved metrics when user logs in
  useEffect(() => {
    if (userId) {
      fetchSavedMetrics();
    } else {
      setSavedMetrics(null);
      setLoading(false);
    }
  }, [userId]);

  const fetchSavedMetrics = async () => {
    if (!userId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("height_cm, height_ft, height_in, height_unit, weight, weight_unit, body_fat, age, sex, metric_type")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user metrics:", error);
      setLoading(false);
      return;
    }

    if (data && data.weight) {
      // User has saved metrics
      const metrics: UserMetricsData = {
        metricType: (data.metric_type as "bmi" | "ffmi") || "bmi",
        heightUnit: (data.height_unit as "cm" | "ft") || "cm",
        weightUnit: (data.weight_unit as "kg" | "lbs") || "kg",
        heightCm: data.height_cm?.toString() || "",
        heightFt: data.height_ft?.toString() || "",
        heightIn: data.height_in?.toString() || "",
        weight: data.weight?.toString() || "",
        bodyFat: data.body_fat?.toString() || "",
        age: data.age?.toString() || "",
        sex: (data.sex as "male" | "female" | "") || "",
      };
      setSavedMetrics(metrics);
    }
    setLoading(false);
  };

  const saveMetrics = useCallback(async (metrics: UserMetricsData): Promise<boolean> => {
    if (!userId) {
      // Not logged in - metrics are session-only, no need to save
      return true;
    }

    // Determine the best metric type to save based on available data
    // If both BMI and FFM data is available, use FFM as it's more accurate
    let effectiveMetricType = metrics.metricType;
    const hasFFMData = metrics.bodyFat && parseFloat(metrics.bodyFat) > 0;
    const hasBMIData = metrics.weight && metrics.age && metrics.sex;
    
    if (hasFFMData && hasBMIData) {
      effectiveMetricType = "ffmi"; // FFM is more accurate when both are available
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        height_cm: metrics.heightCm ? parseFloat(metrics.heightCm) : null,
        height_ft: metrics.heightFt ? parseFloat(metrics.heightFt) : null,
        height_in: metrics.heightIn ? parseFloat(metrics.heightIn) : null,
        height_unit: metrics.heightUnit,
        weight: metrics.weight ? parseFloat(metrics.weight) : null,
        weight_unit: metrics.weightUnit,
        body_fat: metrics.bodyFat ? parseFloat(metrics.bodyFat) : null,
        age: metrics.age ? parseInt(metrics.age) : null,
        sex: metrics.sex || null,
        metric_type: effectiveMetricType,
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Error saving user metrics:", error);
      toast({
        title: "Error",
        description: "Failed to save your metrics. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
      return false;
    }

    setSavedMetrics({ ...metrics, metricType: effectiveMetricType });
    return true;
  }, [userId, toast]);

  return {
    isLoggedIn: !!userId,
    loading,
    savedMetrics,
    saveMetrics,
    refetch: fetchSavedMetrics,
  };
};
