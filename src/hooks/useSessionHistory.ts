import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert } from "@/integrations/supabase/types";
import {
  historyAccountUserId,
  type SaveSessionSnapshotInput,
  type SessionSnapshot,
} from "@/lib/sessionHistory";

export type {
  SaveSessionSnapshotInput,
  SessionHistoryDrink,
  SessionSnapshot,
} from "@/lib/sessionHistory";

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

  const userId = historyAccountUserId(session);
  const isAccount = userId !== null;

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
