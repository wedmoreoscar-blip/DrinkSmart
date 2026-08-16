import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAnonymousProfile,
  loadAnonymousProfile,
  saveAnonymousProfile,
} from "@/lib/anonymousProfileStore";
import { defaultPreferences } from "@/lib/preferences";

const metrics = {
  metricType: "bmi" as const,
  heightUnit: "cm" as const,
  weightUnit: "kg" as const,
  heightCm: "180",
  heightFt: "",
  heightIn: "",
  weight: "80",
  bodyFat: "",
  age: "30",
  sex: "male" as const,
};

// Vitest runs node-only here — the repo has neither jsdom nor happy-dom — so
// the store's single browser dependency is stubbed rather than adding one.
function installLocalStorage(): void {
  const store = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
  };
}

// W6-1 clause 2: a session-scoped home for an anonymous user's profile.
describe("anonymousProfileStore", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it("round-trips stats, preferences and the onboarding marker", () => {
    saveAnonymousProfile({ metrics, preferences: defaultPreferences, onboardedAt: "2026-08-16T20:00:00Z" });
    const loaded = loadAnonymousProfile();
    expect(loaded.metrics).toEqual(metrics);
    expect(loaded.onboardedAt).toBe("2026-08-16T20:00:00Z");
  });

  it("loads defaults when nothing is stored", () => {
    const loaded = loadAnonymousProfile();
    expect(loaded.metrics).toBeNull();
    expect(loaded.onboardedAt).toBeNull();
    expect(loaded.preferences).toEqual(defaultPreferences);
  });

  it("loads defaults rather than throwing on a malformed payload", () => {
    (globalThis as unknown as { window: { localStorage: Storage } }).window.localStorage.setItem("drinksmart.anonymousProfile.v1", "{not json");
    expect(loadAnonymousProfile().metrics).toBeNull();
    (globalThis as unknown as { window: { localStorage: Storage } }).window.localStorage.setItem("drinksmart.anonymousProfile.v1", JSON.stringify({ metrics: 42 }));
    expect(loadAnonymousProfile().metrics).toBeNull();
  });

  it("rejects a partial metrics object rather than half-restoring stats", () => {
    window.localStorage.setItem(
      "drinksmart.anonymousProfile.v1",
      JSON.stringify({ metrics: { weight: "80" }, onboardedAt: "x" }),
    );
    const loaded = loadAnonymousProfile();
    expect(loaded.metrics).toBeNull();
    expect(loaded.onboardedAt).toBe("x");
  });

  it("clears everything it stored", () => {
    saveAnonymousProfile({ metrics, preferences: defaultPreferences, onboardedAt: "x" });
    clearAnonymousProfile();
    expect(loadAnonymousProfile().metrics).toBeNull();
    expect(loadAnonymousProfile().onboardedAt).toBeNull();
  });
});

/**
 * The locked rule is that without an account nothing persists *between*
 * sessions. Writing the profile to localStorage satisfies "a night works end
 * to end"; only clearing it at session teardown satisfies the other half. A
 * store with an unwired `clear` looks complete and behaves like permanent
 * storage, so this pins the wiring rather than the function's existence.
 */
describe("anonymous data does not outlive the night", () => {
  const appContext = readFileSync(
    new URL("../contexts/AppContext.tsx", import.meta.url),
    "utf8",
  );

  it("clears the anonymous profile and overrides when a session ends or expires", () => {
    expect(appContext).toMatch(/import \{ clearAnonymousProfile \}/);
    expect(appContext).toMatch(/import \{ clearAnonymousOverrides \}/);
    // Both teardown paths — the explicit end and the six-hour abandonment
    // expiry — must clear, so exactly two call sites of each.
    expect(appContext.match(/clearAnonymousProfile\(\)/g) ?? []).toHaveLength(2);
    expect(appContext.match(/clearAnonymousOverrides\(\)/g) ?? []).toHaveLength(2);
  });
});
