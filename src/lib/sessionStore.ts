/**
 * localStorage-backed persistence for the active drinking session.
 * Survives page refresh, browser restart, and OS-killing the tab.
 *
 * The deterministic engine state (timeline, calculations, BAC) is NOT
 * persisted — it's recomputed from the inputs below.
 */

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

export type PersistedSession = {
  inebriationLevel: number;
  drinks: PersistedDrink[];
  lockedDrinkIds: string[];
  drinkingStartTime: string | null; // ISO string
  drinkingTargetTime: string | null; // ISO string
};

export type LoadedSession = Omit<
  PersistedSession,
  "drinkingStartTime" | "drinkingTargetTime"
> & {
  drinkingStartTime: Date | null;
  drinkingTargetTime: Date | null;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadSession(): LoadedSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;

    if (typeof parsed.inebriationLevel !== "number") return null;

    return {
      inebriationLevel: parsed.inebriationLevel,
      drinks: Array.isArray(parsed.drinks) ? (parsed.drinks as PersistedDrink[]) : [],
      lockedDrinkIds: Array.isArray(parsed.lockedDrinkIds)
        ? parsed.lockedDrinkIds.filter((s): s is string => typeof s === "string")
        : [],
      drinkingStartTime: parsed.drinkingStartTime
        ? new Date(parsed.drinkingStartTime)
        : null,
      drinkingTargetTime: parsed.drinkingTargetTime
        ? new Date(parsed.drinkingTargetTime)
        : null,
    };
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
      const toStore: PersistedSession = {
        inebriationLevel: session.inebriationLevel,
        drinks: session.drinks,
        lockedDrinkIds: session.lockedDrinkIds,
        drinkingStartTime: session.drinkingStartTime?.toISOString() ?? null,
        drinkingTargetTime: session.drinkingTargetTime?.toISOString() ?? null,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
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
