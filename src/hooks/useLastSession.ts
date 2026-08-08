import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type LastSessionDrink = {
  id: string;
  category: string;
  drink: string;
  customABV?: string;
  quantity: string;
  unit: "ml" | "oz" | "shots" | "pints" | "glass";
  mixer?: string;
  mixerQuantity?: string;
  mixerUnit?: "ml" | "oz" | "shots" | "pints" | "glass";
  isCustom?: boolean;
  customName?: string;
  pricePerUnit?: number | null;
  portions?: number;
};

export type LastSession = {
  duration_minutes: number;
  buzz_level: number;
  drinks: LastSessionDrink[];
  updated_at: string;
};

export type UpsertLastSessionInput = {
  duration_minutes: number;
  buzz_level: number;
  drinks: LastSessionDrink[];
};

const lastSessionKey = (userId: string | null) => ["lastSession", userId] as const;

export const useLastSession = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  const queryKey = lastSessionKey(userId);

  const query = useQuery<LastSession | null>({
    queryKey,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("user_sessions")
        .select("duration_minutes, buzz_level, drinks, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        duration_minutes: data.duration_minutes,
        buzz_level: data.buzz_level,
        drinks: (data.drinks as LastSessionDrink[]) ?? [],
        updated_at: data.updated_at,
      };
    },
  });

  const upsertMut = useMutation<void, Error, UpsertLastSessionInput>({
    mutationFn: async ({ duration_minutes, buzz_level, drinks }) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase.from("user_sessions").upsert(
        {
          user_id: userId,
          duration_minutes,
          buzz_level,
          drinks: drinks as unknown as Json,
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err) => {
      console.error("Failed to upsert last session:", err);
    },
  });

  const upsertLastSession = useCallback(
    async (input: UpsertLastSessionInput): Promise<boolean> => {
      if (!userId) return false;
      try {
        await upsertMut.mutateAsync(input);
        return true;
      } catch {
        return false;
      }
    },
    [userId, upsertMut]
  );

  return {
    lastSession: query.data ?? null,
    loading: query.isLoading,
    isLoggedIn: !!userId,
    upsertLastSession,
  };
};
