/**
 * localStorage-backed persistence for the active drinking session.
 * Survives page refresh, browser restart, and OS-killing the tab.
 *
 * The deterministic engine state (timeline, calculations, BAC summaries,
 * phases, effectivePlanEndTime) is NOT persisted — it's recomputed from the
 * inputs below. Only minimal break/action/consumption inputs are stored,
 * with dates as ISO strings.
 */

import { sourceDrinkIdFromEntryId } from "@/lib/sessionEngine";

const STORAGE_KEY = "drinksmart.session.v1";
const SAVE_DEBOUNCE_MS = 500;

export type PersistedDrink = {
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

export type PersistedBreak = {
  entryId: string;
  durationMinutes: number;
  volumeMl?: number;
  drinkName: string;
};

export type PersistedConsumedEntry = {
  entryId: string;
  sourceDrinkId: string;
  consumedAt: string; // ISO string
  pureAlcoholMl: number;
};

export type PersistedSession = {
  inebriationLevel: number;
  drinks: PersistedDrink[];
  lockedDrinkIds: string[];
  drinkingStartTime: string | null; // ISO string
  drinkingTargetTime: string | null; // ISO string
  breaks: PersistedBreak[];
  consumedTimelineEntries: PersistedConsumedEntry[];
  delayedEntryMinutes: Record<string, number>;
};

export type LoadedConsumedEntry = Omit<PersistedConsumedEntry, "consumedAt"> & {
  consumedAt: Date;
};

export type LoadedSession = Omit<
  PersistedSession,
  "drinkingStartTime" | "drinkingTargetTime" | "consumedTimelineEntries"
> & {
  drinkingStartTime: Date | null;
  drinkingTargetTime: Date | null;
  consumedTimelineEntries: LoadedConsumedEntry[];
};

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/**
 * Hydrate and validate a parsed localStorage payload. A legacy payload with
 * all new fields absent hydrates with empty defaults; malformed entries,
 * invalid dates, and missing-source references are filtered without clearing
 * an otherwise valid session.
 */
export function parseSession(raw: unknown): LoadedSession | null {
  if (!raw || typeof raw !== "object") return null;
  const payload = raw as Record<string, unknown>;
  if (typeof payload.inebriationLevel !== "number") return null;

  const drinks = Array.isArray(payload.drinks) ? (payload.drinks as PersistedDrink[]) : [];
  const drinkIds = new Set(drinks.map((drink) => drink.id));

  const lockedDrinkIds = Array.isArray(payload.lockedDrinkIds)
    ? payload.lockedDrinkIds.filter((id): id is string => typeof id === "string")
    : [];

  const breaks: PersistedBreak[] = [];
  if (Array.isArray(payload.breaks)) {
    for (const candidate of payload.breaks) {
      if (!candidate || typeof candidate !== "object") continue;
      const entry = candidate as Record<string, unknown>;
      if (typeof entry.entryId !== "string" || entry.entryId.length === 0) continue;
      if (
        typeof entry.durationMinutes !== "number" ||
        !Number.isFinite(entry.durationMinutes) ||
        entry.durationMinutes <= 0
      ) {
        continue;
      }
      const volumeMl =
        typeof entry.volumeMl === "number" &&
        Number.isFinite(entry.volumeMl) &&
        entry.volumeMl >= 0
          ? entry.volumeMl
          : undefined;
      breaks.push({
        entryId: entry.entryId,
        durationMinutes: entry.durationMinutes,
        drinkName: typeof entry.drinkName === "string" ? entry.drinkName : "",
        ...(volumeMl !== undefined ? { volumeMl } : {}),
      });
    }
  }

  const consumedTimelineEntries: LoadedConsumedEntry[] = [];
  if (Array.isArray(payload.consumedTimelineEntries)) {
    for (const candidate of payload.consumedTimelineEntries) {
      if (!candidate || typeof candidate !== "object") continue;
      const entry = candidate as Record<string, unknown>;
      if (typeof entry.entryId !== "string" || entry.entryId.length === 0) continue;
      if (typeof entry.sourceDrinkId !== "string" || !drinkIds.has(entry.sourceDrinkId)) {
        continue;
      }
      const consumedAt = parseDate(entry.consumedAt);
      if (!consumedAt) continue;
      if (
        typeof entry.pureAlcoholMl !== "number" ||
        !Number.isFinite(entry.pureAlcoholMl) ||
        entry.pureAlcoholMl < 0
      ) {
        continue;
      }
      consumedTimelineEntries.push({
        entryId: entry.entryId,
        sourceDrinkId: entry.sourceDrinkId,
        consumedAt,
        pureAlcoholMl: entry.pureAlcoholMl,
      });
    }
  }

  const delayedEntryMinutes: Record<string, number> = {};
  if (
    payload.delayedEntryMinutes &&
    typeof payload.delayedEntryMinutes === "object" &&
    !Array.isArray(payload.delayedEntryMinutes)
  ) {
    for (const [key, value] of Object.entries(payload.delayedEntryMinutes)) {
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
      const sourceId = sourceDrinkIdFromEntryId(key);
      if (!sourceId || !drinkIds.has(sourceId)) continue;
      delayedEntryMinutes[key] = value;
    }
  }

  return {
    inebriationLevel: payload.inebriationLevel,
    drinks,
    lockedDrinkIds,
    drinkingStartTime: parseDate(payload.drinkingStartTime),
    drinkingTargetTime: parseDate(payload.drinkingTargetTime),
    breaks,
    consumedTimelineEntries,
    delayedEntryMinutes,
  };
}

export function serializeSession(session: LoadedSession): PersistedSession {
  return {
    inebriationLevel: session.inebriationLevel,
    drinks: session.drinks,
    lockedDrinkIds: session.lockedDrinkIds,
    drinkingStartTime: session.drinkingStartTime?.toISOString() ?? null,
    drinkingTargetTime: session.drinkingTargetTime?.toISOString() ?? null,
    breaks: session.breaks,
    consumedTimelineEntries: session.consumedTimelineEntries.map((entry) => ({
      entryId: entry.entryId,
      sourceDrinkId: entry.sourceDrinkId,
      consumedAt: entry.consumedAt.toISOString(),
      pureAlcoholMl: entry.pureAlcoholMl,
    })),
    delayedEntryMinutes: session.delayedEntryMinutes,
  };
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadSession(): LoadedSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseSession(JSON.parse(raw));
  } catch (err) {
    console.error("Failed to load session from localStorage:", err);
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveSession(session: LoadedSession): void {
  if (!isBrowser()) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeSession(session)));
    } catch (err) {
      console.error("Failed to save session to localStorage:", err);
    }
  }, SAVE_DEBOUNCE_MS);
}

export function clearSession(): void {
  if (!isBrowser()) return;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}
