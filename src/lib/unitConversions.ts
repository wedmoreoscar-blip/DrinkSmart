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
