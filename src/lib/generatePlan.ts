import { supabase } from "@/integrations/supabase/client";
import { getWeightInKg, getHeightInCm, getTBWGrams } from "@/lib/unitConversions";
import {
  buildStaticCatalog,
  getCategoryDefaultUnit,
  parseCatalogId,
  type CatalogItem,
  type DrinkUnit,
} from "@/lib/planCatalog";
import type { PreferenceData } from "@/lib/preferences";
import { greedyPlanFallback } from "@/lib/greedyPlanFallback";

const EDGE_FUNCTION_TIMEOUT_MS = 6000;

export type GeneratedDrink = {
  catalog_id: string;
  quantity: number;
  unit: DrinkUnit;
  ml?: number;
};

export type GeneratedPlan = {
  drinks: GeneratedDrink[];
  notes: string;
};

export type LockedDrink = {
  catalog_id: string;
  quantity: number;
  unit: DrinkUnit;
  ethanol_ml: number;
};

export type GeneratePlanInput = {
  target_ethanol_ml: number;
  duration_minutes: number;
  preferences: PreferenceData;
  catalog: CatalogItem[];
  locked_drinks?: LockedDrink[];
  exclude?: string[];
};

export type UserMetricsForCalc = {
  metricType: "bmi" | "ffmi";
  heightUnit: "cm" | "ft";
  weightUnit: "kg" | "lbs";
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  bodyFat: string;
  age: string;
  sex: "male" | "female" | "";
};

/**
 * Compute the pure-ethanol budget in mL using the same Widmark/TBW formula
 * as the in-context engine. Returns null if inputs are incomplete.
 */
export function computeTargetEthanolMl(
  metrics: UserMetricsForCalc,
  targetBAC: { min: number; max: number },
  timeDeltaHours: number | null
): number | null {
  if (!metrics.weight || timeDeltaHours === null) return null;

  const weightKg = getWeightInKg(metrics.weight, metrics.weightUnit);
  if (!weightKg) return null;

  const heightCm = getHeightInCm(
    metrics.heightCm,
    metrics.heightFt,
    metrics.heightIn,
    metrics.heightUnit
  );

  const tbwGrams = getTBWGrams({
    metricType: metrics.metricType,
    bodyFat: metrics.bodyFat,
    age: metrics.age,
    heightCm,
    weightKg,
    sex: metrics.sex,
  });
  if (!tbwGrams) return null;

  const BAC = (targetBAC.min + targetBAC.max) / 2;
  const pureAlcoholGrams = (BAC / 100 + 0.00015 * timeDeltaHours) * tbwGrams;
  return pureAlcoholGrams / 0.789;
}

export type GeneratePlanResult = GeneratedPlan & { usedFallback: boolean };

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("generate-plan timed out")), ms)
    ),
  ]);
}

async function invokeEdgeFunction(input: GeneratePlanInput): Promise<GeneratedPlan> {
  const { data, error } = await supabase.functions.invoke<GeneratedPlan>(
    "generate-plan",
    { body: input }
  );

  if (error) throw error;
  if (!data || !Array.isArray(data.drinks)) {
    throw new Error("Invalid plan response");
  }
  return data;
}

/**
 * Invoke the generate-plan edge function with a deterministic offline fallback.
 * Returns `usedFallback: true` when the edge function fails or times out so the
 * caller can surface a small notice.
 */
export async function generatePlan(input: GeneratePlanInput): Promise<GeneratePlanResult> {
  try {
    const data = await withTimeout(invokeEdgeFunction(input), EDGE_FUNCTION_TIMEOUT_MS);
    return { ...data, usedFallback: false };
  } catch (err) {
    console.warn("generate-plan edge function failed, using greedy fallback:", err);
    const fallback = greedyPlanFallback(input);
    return { ...fallback, usedFallback: true };
  }
}

/**
 * Convert an AI-chosen drink back into the AppContext DrinkEntry shape.
 * Returns null if the catalog_id can't be resolved.
 */
export function generatedDrinkToEntry(
  generated: GeneratedDrink,
  catalog: CatalogItem[]
): {
  id: string;
  category: string;
  drink: string;
  customABV: string;
  quantity: string;
  unit: DrinkUnit;
  isCustom: boolean;
} | null {
  const item = catalog.find((c) => c.id === generated.catalog_id);
  if (!item) return null;

  const unit = generated.unit ?? getCategoryDefaultUnit(item.category);

  let quantity: string;
  if (unit === "ml" || unit === "oz") {
    // For volume-based units the DrinkEntry quantity IS the volume
    const ml = generated.ml ?? item.typical_ml;
    quantity = ml.toString();
  } else {
    // For shots/pints/glass the DrinkEntry quantity is the count
    quantity = (generated.quantity || 1).toString();
  }

  return {
    id: crypto.randomUUID(),
    category: item.category,
    drink: item.name,
    customABV: item.abv.toString(),
    quantity,
    unit,
    isCustom: false,
  };
}

export function buildCatalog(): CatalogItem[] {
  return buildStaticCatalog();
}

export { parseCatalogId };
