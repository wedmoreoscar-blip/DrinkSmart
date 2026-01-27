
# Fix Timeline Bug: Drinks Showing 0% Alcohol and Same Time

## Problem Summary

The timeline is displaying all drinks at the same time with 0.0% of target and 0.0ml pure alcohol. This affects:
- Drinks from the Wetherspoons database
- Drinks from scanned menus (session establishments)
- Any drink not in the hardcoded static drink list

## Root Cause Analysis

The `calculateDrinkTimeline` function in `AppContext.tsx` has a flawed ABV lookup mechanism:

1. **What happens when you select a drink:**
   - When selecting ANY drink (from establishment or custom), the ABV is stored in `customABV` field
   - Establishment drinks have `isCustom: false` but still have `customABV` set

2. **What happens when calculating the timeline:**
   - The code only reads `customABV` if `isCustom === true`
   - For non-custom drinks, it looks up ABV from `drinkCategories` (static data)
   - Establishment drinks (Eristoff, etc.) are NOT in `drinkCategories` - they're in the Supabase database
   - Result: ABV returns 0, causing 0% of target and 0 minutes allocated (all drinks at same time)

## Solution

Modify the ABV lookup logic in `calculateDrinkTimeline` to prioritize the `customABV` field that is already being populated for all drinks at selection time.

## Technical Implementation

### File: `src/contexts/AppContext.tsx`

**Current Code (lines 318-325):**
```javascript
// Get ABV
let abv = 0;
if (drink.isCustom) {
  abv = parseFloat(drink.customABV || "0");
} else {
  const drinkData = allDrinks.find(d => d.name === drink.drink);
  abv = drinkData?.abv || 0;
}
```

**Fixed Code:**
```javascript
// Get ABV - prioritize customABV since it's set for ALL drinks at selection time
// This ensures establishment drinks and scanned menu drinks work correctly
let abv = 0;
if (drink.customABV) {
  // customABV is set for both custom drinks AND establishment drinks when selected
  abv = parseFloat(drink.customABV);
} else if (drink.isCustom) {
  // Fallback for custom drinks without ABV (shouldn't happen)
  abv = 0;
} else {
  // Fallback lookup in static drinkCategories (legacy behavior)
  const drinkData = allDrinks.find(d => d.name === drink.drink);
  abv = drinkData?.abv || 0;
}
```

This simple change:
- Uses `customABV` when available (the preferred source for all drinks)
- Falls back to static lookup for legacy compatibility
- Properly calculates alcohol content for establishment and scanned menu drinks
- Correctly distributes drink times based on their actual alcohol percentages

## Testing

After the fix, the "Eristoff" vodka shots should:
1. Show correct ABV (37.5% for Eristoff vodka)
2. Display proper "X% of target" values
3. Be distributed across the drinking window instead of all at the same time
