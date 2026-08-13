import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import {
  defaultPreferences,
  parsePreferences,
  type PreferenceData,
} from "@/lib/preferences";
import { metricsToColumns } from "@/lib/userMetricsPersistence";

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

export type ThemePreference = "light" | "dark" | "system";

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

type ProfileQueryData = {
  metrics: UserMetricsData | null;
  preferences: PreferenceData;
  theme: ThemePreference;
  onboardedAt: string | null;
};

const emptySnapshot: ProfileQueryData = {
  metrics: null,
  preferences: { ...defaultPreferences },
  theme: "system",
  onboardedAt: null,
};

const profileQueryKey = (userId: string | null) => ["profile", userId] as const;

function columnsToMetrics(data: {
  metric_type: string | null;
  height_unit: string | null;
  weight_unit: string | null;
  height_cm: number | null;
  height_ft: number | null;
  height_in: number | null;
  weight: number | null;
  body_fat: number | null;
  age: number | null;
  sex: string | null;
}): UserMetricsData {
  return {
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
}

async function generateUsername(): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const email = userData?.user?.email || "";
  return email.split("@")[0] || `user_${Date.now()}`;
}

export const useUserMetrics = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
      setAuthResolved(true);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
      setAuthResolved(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const queryKey = profileQueryKey(userId);

  const query = useQuery<ProfileQueryData>({
    queryKey,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!userId) return emptySnapshot;

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "height_cm, height_ft, height_in, height_unit, weight, weight_unit, body_fat, age, sex, metric_type, preferences, theme, onboarded_at"
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return emptySnapshot;

      return {
        metrics: data.weight ? columnsToMetrics(data) : null,
        preferences: parsePreferences(data.preferences),
        theme: (data.theme as ThemePreference) || "system",
        onboardedAt: data.onboarded_at ?? null,
      };
    },
  });

  const data = query.data ?? emptySnapshot;

  const saveMetricsMut = useMutation<UserMetricsData, Error, UserMetricsData>({
    mutationFn: async (metrics) => {
      if (!userId) return metrics;
      const { columns, effectiveMetricType } = metricsToColumns(metrics);

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const result = existingProfile
        ? await supabase.from("profiles").update(columns).eq("user_id", userId)
        : await supabase.from("profiles").insert({
            user_id: userId,
            username: await generateUsername(),
            ...columns,
          });

      if (result.error) throw result.error;
      return { ...metrics, metricType: effectiveMetricType };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err) => {
      console.error("Error saving user metrics:", err);
      toast({
        title: "Error",
        description: "Failed to save your metrics. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const savePreferencesMut = useMutation<
    PreferenceData,
    Error,
    PreferenceData,
    { previous?: ProfileQueryData }
  >({
    mutationFn: async (preferences) => {
      if (!userId) return preferences;
      const { error } = await supabase
        .from("profiles")
        .update({ preferences: preferences as unknown as Json })
        .eq("user_id", userId);
      if (error) throw error;
      return preferences;
    },
    onMutate: async (newPrefs) => {
      if (!userId) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ProfileQueryData>(queryKey);
      queryClient.setQueryData<ProfileQueryData>(queryKey, (old) => ({
        ...(old ?? emptySnapshot),
        preferences: newPrefs,
      }));
      return { previous };
    },
    onError: (err, _newPrefs, ctx) => {
      console.error("Error saving preferences:", err);
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast({
        title: "Error",
        description: "Failed to save your preferences.",
        variant: "destructive",
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const saveThemeMut = useMutation<
    ThemePreference,
    Error,
    ThemePreference,
    { previous?: ProfileQueryData }
  >({
    mutationFn: async (theme) => {
      if (!userId) return theme;
      const { error } = await supabase
        .from("profiles")
        .update({ theme })
        .eq("user_id", userId);
      if (error) throw error;
      return theme;
    },
    onMutate: async (newTheme) => {
      if (!userId) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ProfileQueryData>(queryKey);
      queryClient.setQueryData<ProfileQueryData>(queryKey, (old) => ({
        ...(old ?? emptySnapshot),
        theme: newTheme,
      }));
      return { previous };
    },
    onError: (err, _newTheme, ctx) => {
      console.error("Error saving theme:", err);
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const completeOnboardingMut = useMutation<
    void,
    Error,
    { metrics: UserMetricsData; preferences: PreferenceData }
  >({
    mutationFn: async ({ metrics, preferences }) => {
      if (!userId) throw new Error("Not authenticated");

      const { columns } = metricsToColumns(metrics);
      const onboardedAt = new Date().toISOString();

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const payload = {
        ...columns,
        preferences: preferences as unknown as Json,
        onboarded_at: onboardedAt,
      };

      const result = existingProfile
        ? await supabase.from("profiles").update(payload).eq("user_id", userId)
        : await supabase.from("profiles").insert({
            user_id: userId,
            username: await generateUsername(),
            ...payload,
          });

      if (result.error) throw result.error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err) => {
      console.error("Error completing onboarding:", err);
      toast({
        title: "Error",
        description: "Failed to save your onboarding details. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveMetrics = useCallback(
    async (metrics: UserMetricsData): Promise<boolean> => {
      if (!userId) return true;
      try {
        await saveMetricsMut.mutateAsync(metrics);
        return true;
      } catch {
        return false;
      }
    },
    [userId, saveMetricsMut]
  );

  const savePreferences = useCallback(
    async (preferences: PreferenceData): Promise<boolean> => {
      if (!userId) return true;
      try {
        await savePreferencesMut.mutateAsync(preferences);
        return true;
      } catch {
        return false;
      }
    },
    [userId, savePreferencesMut]
  );

  const saveTheme = useCallback(
    async (theme: ThemePreference): Promise<boolean> => {
      if (!userId) return true;
      try {
        await saveThemeMut.mutateAsync(theme);
        return true;
      } catch {
        return false;
      }
    },
    [userId, saveThemeMut]
  );

  const completeOnboarding = useCallback(
    async (metrics: UserMetricsData, preferences: PreferenceData): Promise<boolean> => {
      if (!userId) return false;
      try {
        await completeOnboardingMut.mutateAsync({ metrics, preferences });
        return true;
      } catch {
        return false;
      }
    },
    [userId, completeOnboardingMut]
  );

  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    isLoggedIn: !!userId,
    loading: !authResolved || query.isLoading,
    savedMetrics: data.metrics,
    preferences: data.preferences,
    theme: data.theme,
    onboardedAt: data.onboardedAt,
    isOnboarded: !!data.onboardedAt,
    saveMetrics,
    savePreferences,
    saveTheme,
    completeOnboarding,
    refetch,
  };
};

export { defaultMetrics };
