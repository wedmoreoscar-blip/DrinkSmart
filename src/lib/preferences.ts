import { drinkCategories } from "@/data/drinksData";

export type PreferenceData = {
  sweet: number;
  strong: number;
  categories_liked: string[];
  categories_avoided: string[];
};

export const defaultPreferences: PreferenceData = {
  sweet: 0.5,
  strong: 0.5,
  categories_liked: [],
  categories_avoided: [],
};

export const preferenceCategoryKeys = Object.keys(drinkCategories).filter(
  (key) => key !== "custom"
);

export function getCategoryLabel(key: string): string {
  return drinkCategories[key]?.label ?? key;
}

export function parsePreferences(raw: unknown): PreferenceData {
  if (!raw || typeof raw !== "object") return { ...defaultPreferences };
  const r = raw as Record<string, unknown>;
  const clamp = (n: unknown, fallback: number) => {
    const v = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(v)) return fallback;
    return Math.min(1, Math.max(0, v));
  };
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  return {
    sweet: clamp(r.sweet, defaultPreferences.sweet),
    strong: clamp(r.strong, defaultPreferences.strong),
    categories_liked: arr(r.categories_liked),
    categories_avoided: arr(r.categories_avoided),
  };
}
