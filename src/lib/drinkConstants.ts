// Standard drink measurements (in ml)
// These values are used for calculations but not displayed directly to users
export const SHOT_ML = 30;
export const PINT_ML = 568;
export const OZ_ML = 29.5735;
export const GLASS_ML = 175;

// Standard ABV percentages for common drinks
export const VODKA_ABV = 0.375; // 37.5%
export const BEER_ABV = 0.05; // 5%
export const WINE_ABV = 0.12; // 12%

/**
 * Calculate pure alcohol content in ml
 * Formula: alcohol in ml = Q × (ABV/100)
 * where Q is the volume in ml and ABV is the alcohol percentage
 */
export const calculatePureAlcohol = (volumeMl: number, abvPercentage: number): number => {
  return volumeMl * (abvPercentage / 100);
};
