/**
 * BAC Calculation Utilities
 * Calculates alcohol intake needed to reach target BAC levels
 */

type CalculationInputs = {
  targetBAC: number; // Target BAC as decimal (e.g., 0.08 for 0.08%)
  weightKg: number; // Weight in kilograms
  sex: "male" | "female";
  hoursSinceDrinking: number;
  drinkABV?: number; // Optional: ABV of chosen drink
};

type CalculationResult = {
  pureAlcoholGrams: number;
  pureAlcoholMl: number;
  finalAlcoholIntakeMl?: number; // Only if drinkABV is provided
};

/**
 * Calculate alcohol needed to reach target BAC
 * Formula: Pure alcohol in grams = (BAC/100 + (0.00015*HOURS)) * (WEIGHT in grams) * R
 * where R = 0.68 for males, 0.55 for females
 */
export function calculateAlcoholIntake(inputs: CalculationInputs): CalculationResult {
  const { targetBAC, weightKg, sex, hoursSinceDrinking, drinkABV } = inputs;

  // Convert weight to grams
  const weightGrams = weightKg * 1000;

  // Get R value based on sex
  const R = sex === "male" ? 0.68 : 0.55;

  // Calculate pure alcohol in grams
  const pureAlcoholGrams = (targetBAC / 100 + 0.00015 * hoursSinceDrinking) * weightGrams * R;

  // Convert to ml (divide by density of alcohol: 0.789 g/ml)
  const pureAlcoholMl = pureAlcoholGrams / 0.789;

  // If drink ABV is provided, calculate final alcohol intake
  let finalAlcoholIntakeMl: number | undefined;
  if (drinkABV && drinkABV > 0) {
    finalAlcoholIntakeMl = (pureAlcoholMl * 100) / drinkABV;
  }

  return {
    pureAlcoholGrams,
    pureAlcoholMl,
    finalAlcoholIntakeMl,
  };
}

/**
 * Convert weight from pounds to kilograms
 */
export function lbsToKg(lbs: number): number {
  return lbs * 0.453592;
}

/**
 * Get hours elapsed since a given start date
 */
export function getHoursElapsed(startDate: Date): number {
  const now = new Date();
  const millisElapsed = now.getTime() - startDate.getTime();
  return millisElapsed / (1000 * 60 * 60); // Convert to hours
}
