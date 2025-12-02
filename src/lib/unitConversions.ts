/**
 * Utility functions for converting between different measurement units
 */

/**
 * Convert height from feet and inches to centimeters
 * @param feet - Height in feet
 * @param inches - Additional inches
 * @returns Height in centimeters
 */
export const convertFeetInchesToCm = (feet: number, inches: number): number => {
  const totalInches = feet * 12 + inches;
  return totalInches * 2.54;
};

/**
 * Convert height from centimeters to feet and inches
 * @param cm - Height in centimeters
 * @returns Object with feet and inches
 */
export const convertCmToFeetInches = (cm: number): { feet: number; inches: number } => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};

/**
 * Convert weight from pounds to kilograms
 * @param lbs - Weight in pounds
 * @returns Weight in kilograms
 */
export const convertLbsToKg = (lbs: number): number => {
  return lbs * 0.453592;
};

/**
 * Convert weight from kilograms to pounds
 * @param kg - Weight in kilograms
 * @returns Weight in pounds
 */
export const convertKgToLbs = (kg: number): number => {
  return kg / 0.453592;
};

/**
 * Convert weight from pounds to grams
 * @param lbs - Weight in pounds
 * @returns Weight in grams
 */
export const convertLbsToGrams = (lbs: number): number => {
  return lbs * 453.592;
};

/**
 * Convert weight from kilograms to grams
 * @param kg - Weight in kilograms
 * @returns Weight in grams
 */
export const convertKgToGrams = (kg: number): number => {
  return kg * 1000;
};

/**
 * Get height in centimeters regardless of input unit
 * @param heightCm - Height in cm (if unit is cm)
 * @param heightFt - Height in feet (if unit is ft)
 * @param heightIn - Height in inches (if unit is ft)
 * @param heightUnit - The unit being used
 * @returns Height in centimeters
 */
export const getHeightInCm = (
  heightCm: string,
  heightFt: string,
  heightIn: string,
  heightUnit: "cm" | "ft"
): number | null => {
  if (heightUnit === "cm") {
    const cm = parseFloat(heightCm);
    return isNaN(cm) ? null : cm;
  } else {
    const ft = parseFloat(heightFt) || 0;
    const inches = parseFloat(heightIn) || 0;
    if (ft === 0 && inches === 0) return null;
    return convertFeetInchesToCm(ft, inches);
  }
};

/**
 * Get weight in kilograms regardless of input unit
 * @param weight - Weight value
 * @param weightUnit - The unit being used
 * @returns Weight in kilograms
 */
export const getWeightInKg = (
  weight: string,
  weightUnit: "kg" | "lbs"
): number | null => {
  const weightValue = parseFloat(weight);
  if (isNaN(weightValue)) return null;
  
  return weightUnit === "kg" ? weightValue : convertLbsToKg(weightValue);
};

/**
 * Get weight in grams regardless of input unit
 * @param weight - Weight value
 * @param weightUnit - The unit being used
 * @returns Weight in grams
 */
export const getWeightInGrams = (
  weight: string,
  weightUnit: "kg" | "lbs"
): number | null => {
  const weightValue = parseFloat(weight);
  if (isNaN(weightValue)) return null;
  
  return weightUnit === "kg" ? convertKgToGrams(weightValue) : convertLbsToGrams(weightValue);
};

/**
 * Calculate Total Body Water using the Watson formula
 * Returns TBW in grams (for use in BAC calculations)
 * 
 * Watson formulas:
 * Male: TBW (L) = 2.447 - (0.09156 × age) + (0.1074 × height_cm) + (0.3362 × weight_kg)
 * Female: TBW (L) = -2.097 + (0.1069 × height_cm) + (0.2466 × weight_kg)
 * 
 * @param age - Age in years
 * @param heightCm - Height in centimeters
 * @param weightKg - Weight in kilograms
 * @param sex - "male" or "female"
 * @returns Total Body Water in grams
 */
export const calculateWatsonTBW = (
  age: number,
  heightCm: number,
  weightKg: number,
  sex: "male" | "female"
): number => {
  let tbwLiters: number;
  
  if (sex === "male") {
    tbwLiters = 2.447 - (0.09156 * age) + (0.1074 * heightCm) + (0.3362 * weightKg);
  } else {
    tbwLiters = -2.097 + (0.1069 * heightCm) + (0.2466 * weightKg);
  }
  
  // Convert liters to grams (1 liter of water = 1000 grams)
  return tbwLiters * 1000;
};
