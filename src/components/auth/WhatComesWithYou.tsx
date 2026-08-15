import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// 4m §G — the "what comes with you" card counts real rows, never asserts safety.
// A column whose count is zero drops out entirely.
const CARD_HEADER = "What comes with you";

type CountColumn = { figure: string; label: string };

type WeightStats = {
  weight: number;
  weight_unit: string;
};

export function WhatComesWithYou({ userId }: { userId: string | null }) {
  const nightsQuery = useQuery({
    queryKey: ["plannedNightsCount", userId],
    enabled: !!userId,
    queryFn: async (): Promise<number> => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("user_session_history")
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const barsQuery = useQuery({
    queryKey: ["scannedBarsCount", userId],
    enabled: !!userId,
    queryFn: async (): Promise<number> => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("establishments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const statsQuery = useQuery({
    queryKey: ["upgradeCarryoverStats", userId],
    enabled: !!userId,
    queryFn: async (): Promise<WeightStats | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("weight, weight_unit")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data?.weight && data.weight_unit ? data : null;
    },
  });

  const columns: CountColumn[] = [];
  const nights = nightsQuery.data ?? 0;
  const bars = barsQuery.data ?? 0;
  const stats = statsQuery.data;

  if (nights > 0) columns.push({ figure: String(nights), label: "sessions completed" });
  if (bars > 0) columns.push({ figure: String(bars), label: "bars scanned" });
  if (stats) {
    columns.push({
      figure: `${Math.round(stats.weight)} ${stats.weight_unit}`,
      label: "your stats",
    });
  }

  if (columns.length === 0) return null;

  return (
    <div className="rounded-lg bg-card p-[18px]">
      <div className="mb-3 text-micro font-medium uppercase tracking-[0.09em] text-muted-foreground">
        {CARD_HEADER}
      </div>
      <div className="flex gap-3">
        {columns.map((column) => (
          <div key={column.label} className="flex flex-1 flex-col gap-[3px]">
            <div className="text-title tabular-nums leading-none text-foreground">
              {column.figure}
            </div>
            <div className="whitespace-nowrap text-[15px] leading-[1.25] text-muted-foreground">
              {column.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
