import { SHOT_ML, PINT_ML, OZ_ML } from "./drinkConstants";

/**
 * Convert DrinkEntry unit to ml
 */
export const convertToMl = (quantity: number, unit: string): number => {
  switch (unit) {
    case "pints":
      return quantity * PINT_ML;
    case "oz":
      return quantity * OZ_ML;
    case "shots":
      return quantity * SHOT_ML;
    case "glass":
      return quantity * 175; // GLASS_ML
    case "ml":
      return quantity;
    default:
      return quantity;
  }
};

/**
 * Get drink icon based on category
 */
export const getDrinkIcon = (category: string): string => {
  if (category.includes("beer") || category.includes("cider")) return "🍺";
  if (category.includes("wine") || category.includes("champagne")) return "🍷";
  if (category.includes("vodka") || category.includes("rum") || category.includes("whisky") || 
      category.includes("gin") || category.includes("tequila") || category === "shots") return "🥃";
  if (category.includes("cocktail") || category.includes("mixed")) return "🍸";
  return "🍹";
};

/**
 * Format time for display (12-hour with AM/PM)
 */
export const formatTimeDisplay = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
};

/**
 * Calculate time with midnight crossing support
 * Uses milliseconds for sub-minute precision (e.g., 25 drinks in 10 minutes = 24 seconds each)
 */
export const calculateTimeWithMidnight = (startTime: Date, minutesToAdd: number): Date => {
  const millisecondsToAdd = minutesToAdd * 60 * 1000;
  return new Date(startTime.getTime() + millisecondsToAdd);
};

/**
 * Get unit display text
 */
export const getUnitDisplayText = (unitNumber: number, totalUnits: number, unit: string): string => {
  const unitMap: Record<string, string> = {
    "shots": "shot",
    "pints": "pint",
    "glass": "glass",
    "ml": "ml",
    "oz": "oz"
  };
  
  const singularUnit = unitMap[unit] || unit;
  
  if (totalUnits === 1) {
    return singularUnit;
  }
  
  return `${unitNumber}/${totalUnits} ${singularUnit}${unitNumber > 1 ? 's' : ''}`;
};
