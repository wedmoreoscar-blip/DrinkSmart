/**
 * Where an anonymous user's drink overrides live: this device, this session,
 * and nowhere else.
 *
 * An account is what makes things persist. An anonymous user still gets a
 * working night — they can price a drink and have it remembered while they use
 * it — but the record is cleared when the session ends, alongside the plan it
 * belonged to. It is deliberately its own key rather than a field inside
 * `drinksmart.session.v1`, so the two evolve independently.
 */

import { buildOverrideMap, type DrinkOverride, type DrinkOverrideMap } from "@/lib/drinkOverrides";

const STORAGE_KEY = "drinksmart.drinkOverrides.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadAnonymousOverrides(): DrinkOverrideMap {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return buildOverrideMap(Object.values(parsed as Record<string, unknown>));
  } catch (err) {
    console.error("Failed to load drink overrides from localStorage:", err);
    return {};
  }
}

export function saveAnonymousOverrides(overrides: DrinkOverrideMap): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (err) {
    console.error("Failed to save drink overrides to localStorage:", err);
  }
}

export function writeAnonymousOverride(
  overrides: DrinkOverrideMap,
  establishmentDrinkId: string,
  next: DrinkOverride | null,
): DrinkOverrideMap {
  const updated = { ...overrides };
  if (next === null) delete updated[establishmentDrinkId];
  else updated[establishmentDrinkId] = next;
  saveAnonymousOverrides(updated);
  return updated;
}

/** Called when a session ends or expires: nothing outlives the night. */
export function clearAnonymousOverrides(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
