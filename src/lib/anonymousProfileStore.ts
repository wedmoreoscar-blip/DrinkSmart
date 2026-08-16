/**
 * Where an anonymous user's profile lives: this device, this session, and
 * nowhere else.
 *
 * An account is what makes things persist. An anonymous user still gets a
 * working night — their stats, preferences and onboarding marker survive for
 * the session — but the record is cleared when the session ends, and each new
 * session asks for the details again instead of planning from nothing. It is
 * deliberately its own key rather than a field inside `drinksmart.session.v1`,
 * so the two evolve independently.
 */

import type { UserMetricsData } from "@/hooks/useUserMetrics";
import {
  defaultPreferences,
  parsePreferences,
  type PreferenceData,
} from "@/lib/preferences";

const STORAGE_KEY = "drinksmart.anonymousProfile.v1";

export type AnonymousProfileData = {
  metrics: UserMetricsData | null;
  preferences: PreferenceData;
  onboardedAt: string | null;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isUserMetricsData(value: unknown): value is UserMetricsData {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.heightCm === "string" &&
    typeof m.heightFt === "string" &&
    typeof m.heightIn === "string" &&
    typeof m.weight === "string" &&
    typeof m.bodyFat === "string" &&
    typeof m.age === "string" &&
    (m.metricType === "bmi" || m.metricType === "ffmi") &&
    (m.heightUnit === "cm" || m.heightUnit === "ft") &&
    (m.weightUnit === "kg" || m.weightUnit === "lbs") &&
    (m.sex === "male" || m.sex === "female" || m.sex === "")
  );
}

const emptyProfile = (): AnonymousProfileData => ({
  metrics: null,
  preferences: { ...defaultPreferences },
  onboardedAt: null,
});

export function loadAnonymousProfile(): AnonymousProfileData {
  if (!isBrowser()) return emptyProfile();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProfile();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyProfile();
    const p = parsed as Record<string, unknown>;
    return {
      metrics: isUserMetricsData(p.metrics) ? p.metrics : null,
      preferences: parsePreferences(p.preferences),
      onboardedAt: typeof p.onboardedAt === "string" ? p.onboardedAt : null,
    };
  } catch (err) {
    console.error("Failed to load anonymous profile from localStorage:", err);
    return emptyProfile();
  }
}

export function saveAnonymousProfile(profile: AnonymousProfileData): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error("Failed to save anonymous profile to localStorage:", err);
  }
}

/** Called when a session ends or expires: nothing outlives the night. */
export function clearAnonymousProfile(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
