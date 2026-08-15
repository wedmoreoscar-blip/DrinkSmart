import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isAnonymousSession } from "@/lib/anonymousAuth";
import type { Json, TablesInsert } from "@/integrations/supabase/types";

/**
 * One chosen drink inside a saved session snapshot. Carries every serving and
 * portion field the live plan uses so a snapshot is a clean, editable prefill.
 */
export type SessionHistoryDrink = {
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

/** One immutable, account-owned completed session row. */
export type SessionSnapshot = {
  id: string;
  user_id: string;
  duration_minutes: number;
  buzz_level: number;
  drinks: SessionHistoryDrink[];
  completed_at: string;
};

export type SaveSessionSnapshotInput = {
  duration_minutes: number;
  buzz_level: number;
  drinks: SessionHistoryDrink[];
};

const sessionHistoryKey = (userId: string | null) => ["sessionHistory", userId] as const;

/**
 * Account-only session history. An anonymous Supabase user is not an account
 * and neither queries nor inserts history. Snapshots are immutable rows: the
 * save operation inserts, never upserts.
 */
export const useSessionHistory = () => {
  const [session, setSession] = useState<Session | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAccount = session !== null && !isAnonymousSession(session);
  const userId = isAccount ? (session?.user.id ?? null) : null;

  const queryKey = sessionHistoryKey(userId);

  const query = useQuery<SessionSnapshot[]>({
    queryKey,
    enabled: isAccount && userId !== null,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_session_history")
        .select("*")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as SessionSnapshot[];
    },
  });

  const saveSessionSnapshot = useCallback(
    async (input: SaveSessionSnapshotInput): Promise<boolean> => {
      if (!isAccount || !userId) return false;
      const row: TablesInsert<"user_session_history"> = {
        user_id: userId,
        duration_minutes: input.duration_minutes,
        buzz_level: input.buzz_level,
        drinks: input.drinks as unknown as Json,
      };
      const { error } = await supabase.from("user_session_history").insert(row);
      if (error) {
        console.error("Failed to save session snapshot:", error);
        return false;
      }
      await queryClient.invalidateQueries({ queryKey });
      return true;
    },
    [isAccount, userId, queryKey, queryClient]
  );

  const sessions = query.data ?? [];

  return {
    sessions,
    lastSession: sessions[0] ?? null,
    loading: query.isLoading,
    isAccount,
    saveSessionSnapshot,
  };
};
