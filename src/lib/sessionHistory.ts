import type { Session } from "@supabase/supabase-js";
import { isAnonymousSession } from "@/lib/anonymousAuth";

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

export type SessionSnapshot = {
  id: string;
  user_id: string;
  duration_minutes: number;
  buzz_level: number;
  drinks: SessionHistoryDrink[];
  completed_at: string;
  /**
   * The night's money range, in whole pounds. Both nullable: rows written
   * before the budget existed carry nulls, and `budget_max` is null whenever
   * the user set no upper limit.
   */
  budget_min: number | null;
  budget_max: number | null;
};

export type SaveSessionSnapshotInput = {
  duration_minutes: number;
  buzz_level: number;
  drinks: SessionHistoryDrink[];
  budget_min: number | null;
  budget_max: number | null;
};

export function historyAccountUserId(session: Session | null): string | null {
  return session && !isAnonymousSession(session) ? session.user.id : null;
}

export function completedSessionDurationMinutes(
  start: Date | null,
  target: Date | null,
  timeDeltaHours: number | null,
): number {
  if (start && target) {
    const diff = Math.round((target.getTime() - start.getTime()) / 60_000);
    if (diff > 0) return diff;
  }
  if (
    timeDeltaHours !== null &&
    Number.isFinite(timeDeltaHours) &&
    timeDeltaHours > 0
  ) {
    return Math.round(timeDeltaHours * 60);
  }
  return 180;
}

export function realSessionDrinks<T extends SessionHistoryDrink>(drinks: T[]): T[] {
  return drinks.filter((drink) => Boolean(drink.drink || (drink.isCustom && drink.customName)));
}
