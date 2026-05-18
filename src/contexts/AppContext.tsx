import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { getWeightInKg, getHeightInCm, getTBWGrams } from "@/lib/unitConversions";
import { getBACForLevel } from "@/data/buzzLevels";
import { drinkCategories } from "@/data/drinksData";
import { convertToMl, getDrinkIcon, calculateTimeWithMidnight } from "@/lib/timelineHelpers";
import { loadSession, saveSession } from "@/lib/sessionStore";

type MetricType = "bmi" | "ffmi";
type HeightUnit = "cm" | "ft";
type WeightUnit = "kg" | "lbs";

type DrinkEntry = {
  id: string;
  category: string;
  drink: string;
  customABV?: string;
  quantity: string;
  unit: "ml" | "oz" | "shots" | "pints" | "glass";
  mixer?: string;
  mixerQuantity?: string;
  mixerUnit?: "ml" | "oz" | "shots" | "pints" | "glass";
  isCustom?: boolean;
  customName?: string;
  pricePerUnit?: number | null;
  portions?: number; // Number of portions to split ml/oz drinks into
};

type DrinkTimelineEntry = {
  drinkId: string;
  drinkName: string;
  unitNumber: number;
  totalUnits: number;
  time: Date;
  pureAlcoholMl: number;
  percentageOfTarget: number;
  icon: string;
  unit: string;
};

type DrinkCalculation = {
  drinkId: string;
  drinkName: string;
  totalVolumeMl: number;
  pureAlcoholMl: number;
  percentageOfTarget: number;
  timeAllocatedMinutes: number;
  intervalMinutes: number;
  quantity: number;
  unit: string;
};

type UserMetrics = {
  metricType: MetricType;
  heightUnit: HeightUnit;
  weightUnit: WeightUnit;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  bodyFat: string;
  age: string;
  sex: "male" | "female" | "";
};

type AppState = {
  userMetrics: UserMetrics;
  inebriationLevel: number;
  targetBAC: { min: number; max: number }; // BAC range for selected inebriation level
  drinks: DrinkEntry[];
  lockedDrinkIds: string[]; // ids of drinks pinned across regenerations
  startTime: number; // seconds since start (deprecated)
  isTimerRunning: boolean; // deprecated
  startDateTime: Date | null; // actual start time
  drinkingStartTime: Date | null; // when user starts drinking
  drinkingTargetTime: Date | null; // when user wants to reach their buzz
  timeDelta: number | null; // difference between start and target time in hours (float)
  drinkTimeline: DrinkTimelineEntry[]; // calculated timeline entries
  drinkCalculations: DrinkCalculation[]; // calculation details for each drink
  adjustedTargetMl: number | null; // adjusted target when drinks exceed 100%
  isTargetAdjusted: boolean; // whether target was adjusted
};

type AppContextType = {
  state: AppState;
  updateUserMetrics: (metrics: Partial<UserMetrics>) => void;
  updateInebriationLevel: (level: number) => void;
  updateDrinks: (drinks: DrinkEntry[]) => void;
  updateTimeline: (startTime: number, isRunning: boolean) => void;
  updateStartTime: (startTime: Date) => void;
  updateDrinkingStartTime: (time: Date | null) => void;
  updateDrinkingTargetTime: (time: Date | null) => void;
  toggleLockedDrink: (drinkId: string) => void;
  clearLockedDrinks: () => void;
  recalculate: () => void;
  calculateDrinkTimeline: () => void;
  reorderTimelineEntries: (oldIndex: number, newIndex: number) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialState: AppState = {
  userMetrics: {
    metricType: "bmi",
    heightUnit: "cm",
    weightUnit: "kg",
    heightCm: "",
    heightFt: "",
    heightIn: "",
    weight: "",
    bodyFat: "",
    age: "",
    sex: "",
  },
  inebriationLevel: 3,
  targetBAC: { min: 0.06, max: 0.09 }, // Default to level 3 (Tipsy)
  drinks: [{ id: "1", category: "", drink: "", quantity: "", unit: "ml", isCustom: false }],
  lockedDrinkIds: [],
  startTime: 0,
  isTimerRunning: false,
  startDateTime: null,
  drinkingStartTime: null,
  drinkingTargetTime: null,
  timeDelta: null,
  drinkTimeline: [],
  drinkCalculations: [],
  adjustedTargetMl: null,
  isTargetAdjusted: false,
};

function hydrateInitialState(): AppState {
  const persisted = loadSession();
  if (!persisted) return initialState;

  let targetBAC = initialState.targetBAC;
  try {
    const bac = getBACForLevel(persisted.inebriationLevel);
    targetBAC = { min: bac.min_bac, max: bac.max_bac };
  } catch {
    // Unknown level — keep default
  }

  let timeDelta: number | null = null;
  if (persisted.drinkingStartTime && persisted.drinkingTargetTime) {
    const startMin =
      persisted.drinkingStartTime.getHours() * 60 +
      persisted.drinkingStartTime.getMinutes();
    const targetMin =
      persisted.drinkingTargetTime.getHours() * 60 +
      persisted.drinkingTargetTime.getMinutes();
    const diff =
      targetMin <= startMin
        ? 24 * 60 - startMin + targetMin
        : targetMin - startMin;
    timeDelta = diff / 60;
  }

  return {
    ...initialState,
    inebriationLevel: persisted.inebriationLevel,
    targetBAC,
    drinks:
      persisted.drinks.length > 0 ? persisted.drinks : initialState.drinks,
    lockedDrinkIds: persisted.lockedDrinkIds,
    drinkingStartTime: persisted.drinkingStartTime,
    drinkingTargetTime: persisted.drinkingTargetTime,
    timeDelta,
  };
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(hydrateInitialState);

  // Persist the night-state slice to localStorage on change (debounced inside saveSession).
  useEffect(() => {
    saveSession({
      inebriationLevel: state.inebriationLevel,
      drinks: state.drinks,
      lockedDrinkIds: state.lockedDrinkIds,
      drinkingStartTime: state.drinkingStartTime,
      drinkingTargetTime: state.drinkingTargetTime,
    });
  }, [
    state.inebriationLevel,
    state.drinks,
    state.lockedDrinkIds,
    state.drinkingStartTime,
    state.drinkingTargetTime,
  ]);

  const updateUserMetrics = (metrics: Partial<UserMetrics>) => {
    setState((prev) => ({
      ...prev,
      userMetrics: { ...prev.userMetrics, ...metrics },
    }));
  };

  const updateInebriationLevel = (level: number) => {
    const bacRange = getBACForLevel(level);
    setState((prev) => ({
      ...prev,
      inebriationLevel: level,
      targetBAC: { min: bacRange.min_bac, max: bacRange.max_bac },
    }));
  };

  const updateDrinks = (drinks: DrinkEntry[]) => {
    setState((prev) => ({ ...prev, drinks }));
  };

  const updateTimeline = (startTime: number, isRunning: boolean) => {
    setState((prev) => ({ ...prev, startTime, isTimerRunning: isRunning }));
  };

  const updateStartTime = (startTime: Date) => {
    setState((prev) => ({ ...prev, startDateTime: startTime }));
  };

  const calculateTimeDelta = (startTime: Date | null, targetTime: Date | null): number | null => {
    if (!startTime || !targetTime) return null;
    
    const startHour = startTime.getHours();
    const startMinutes = startTime.getMinutes();
    const targetHour = targetTime.getHours();
    const targetMinutes = targetTime.getMinutes();
    
    // Convert times to total minutes for easier calculation
    const startTotalMinutes = startHour * 60 + startMinutes;
    const targetTotalMinutes = targetHour * 60 + targetMinutes;
    
    let diffMinutes: number;
    
    // If target time is earlier in the day than start time, it's the next day
    if (targetTotalMinutes <= startTotalMinutes) {
      // Calculate time to midnight + time from midnight to target
      diffMinutes = (24 * 60 - startTotalMinutes) + targetTotalMinutes;
    } else {
      // Same day calculation
      diffMinutes = targetTotalMinutes - startTotalMinutes;
    }
    
    return diffMinutes / 60; // Convert to hours
  };

  const updateDrinkingStartTime = (time: Date | null) => {
    setState((prev) => {
      const timeDelta = calculateTimeDelta(time, prev.drinkingTargetTime);
      return { ...prev, drinkingStartTime: time, timeDelta };
    });
  };

  const toggleLockedDrink = (drinkId: string) => {
    setState((prev) => ({
      ...prev,
      lockedDrinkIds: prev.lockedDrinkIds.includes(drinkId)
        ? prev.lockedDrinkIds.filter((id) => id !== drinkId)
        : [...prev.lockedDrinkIds, drinkId],
    }));
  };

  const clearLockedDrinks = () => {
    setState((prev) => ({ ...prev, lockedDrinkIds: [] }));
  };

  const updateDrinkingTargetTime = (time: Date | null) => {
    setState((prev) => {
      const timeDelta = calculateTimeDelta(prev.drinkingStartTime, time);
      return { ...prev, drinkingTargetTime: time, timeDelta };
    });
  };

  const recalculate = () => {
    // This will trigger recalculation in the Results tab
    console.log("Recalculating with current state:", state);
  };

  const reorderTimelineEntries = (oldIndex: number, newIndex: number) => {
    setState((prev) => {
      // Create a new array with reordered entries
      const newTimeline = [...prev.drinkTimeline];
      const [movedEntry] = newTimeline.splice(oldIndex, 1);
      newTimeline.splice(newIndex, 0, movedEntry);

      // Recalculate timestamps based on new order
      const { timeDelta, drinkingStartTime } = prev;
      if (!timeDelta || !drinkingStartTime || newTimeline.length === 0) {
        return { ...prev, drinkTimeline: newTimeline };
      }

      const totalTimeDeltaMinutes = timeDelta * 60;
      
      // Calculate time allocation for each drink based on its percentage
      const timelineDrinkIds = [...new Set(newTimeline.map(entry => entry.drinkId))];
      const drinkPercentages = new Map<string, number>();
      timelineDrinkIds.forEach(drinkId => {
        const firstEntry = newTimeline.find(e => e.drinkId === drinkId);
        if (firstEntry) {
          const totalUnits = newTimeline.filter(e => e.drinkId === drinkId).length;
          drinkPercentages.set(drinkId, firstEntry.percentageOfTarget * totalUnits);
        }
      });

      // Assign times based on percentages
      let cumulativeTime = 0;
      const updatedTimeline = newTimeline.map((entry, index) => {
        const drinkId = entry.drinkId;
        const percentage = entry.percentageOfTarget;
        const timeForThisUnit = (percentage / 100) * totalTimeDeltaMinutes;
        
        const entryTime = new Date(drinkingStartTime.getTime() + cumulativeTime * 60 * 1000);
        cumulativeTime += timeForThisUnit;

        return {
          ...entry,
          time: entryTime,
        };
      });

      return { ...prev, drinkTimeline: updatedTimeline };
    });
  };

  const calculateDrinkTimeline = () => {
    const { userMetrics, targetBAC, timeDelta, drinks, drinkingStartTime } = state;
    
    // Check if we have required data (different requirements for FFM vs BMI mode)
    if (!userMetrics.weight || timeDelta === null || !drinkingStartTime) {
      setState((prev) => ({ ...prev, drinkTimeline: [], drinkCalculations: [] }));
      return;
    }

    // Flatten all drinks for lookup
    const allDrinks = Object.entries(drinkCategories).flatMap(([categoryKey, category]) =>
      category.options.map((option) => ({
        name: option.name,
        abv: option.abv,
        category: categoryKey,
      }))
    );

    // Step 1: Calculate total pure alcohol needed using appropriate TBW formula
    const weightKg = getWeightInKg(userMetrics.weight, userMetrics.weightUnit);
    const heightCm = getHeightInCm(
      userMetrics.heightCm,
      userMetrics.heightFt,
      userMetrics.heightIn,
      userMetrics.heightUnit
    );

    if (!weightKg) {
      setState((prev) => ({ ...prev, drinkTimeline: [], drinkCalculations: [] }));
      return;
    }

    // Calculate Total Body Water using appropriate method (FFM or Watson)
    const tbwGrams = getTBWGrams({
      metricType: userMetrics.metricType,
      bodyFat: userMetrics.bodyFat,
      age: userMetrics.age,
      heightCm,
      weightKg,
      sex: userMetrics.sex,
    });

    if (!tbwGrams) {
      setState((prev) => ({ ...prev, drinkTimeline: [], drinkCalculations: [] }));
      return;
    }

    const BAC = (targetBAC.min + targetBAC.max) / 2;
    // Formula: pure alcohol (g) = (BAC/100 + (0.00015 × timeDelta)) × TBW_grams
    const pureAlcoholGrams = (BAC / 100 + 0.00015 * timeDelta) * tbwGrams;
    const totalPureAlcoholNeeded = pureAlcoholGrams / 0.789;

    const totalTimeDeltaMinutes = timeDelta * 60;

    // Step 2: Process each drink (first pass to calculate totals)
    const calculations: DrinkCalculation[] = [];

    drinks.forEach((drink) => {
      if (!drink.quantity) return;
      if (!drink.isCustom && !drink.drink) return;
      if (drink.isCustom && (!drink.customName || !drink.customABV)) return;

      const quantity = parseFloat(drink.quantity);
      if (isNaN(quantity) || quantity <= 0) return;

      const volumeMl = convertToMl(quantity, drink.unit);

      // ABV: customABV is set for custom AND establishment AND scanned drinks.
      // Fall back to the static drinksData lookup only for legacy entries.
      let abv = 0;
      if (drink.customABV) {
        abv = parseFloat(drink.customABV);
      } else if (!drink.isCustom) {
        const drinkData = allDrinks.find((d) => d.name === drink.drink);
        abv = drinkData?.abv || 0;
      }

      const pureAlcoholMl = volumeMl * (abv / 100);

      // ml/oz can be split into portions; shots/pints are per-unit
      let timelineQuantity: number;
      if (drink.unit === "ml" || drink.unit === "oz") {
        timelineQuantity = drink.portions && drink.portions > 1 ? drink.portions : 1;
      } else {
        timelineQuantity = quantity;
      }

      calculations.push({
        drinkId: drink.id,
        drinkName: drink.isCustom ? (drink.customName || "Custom Drink") : drink.drink || "",
        totalVolumeMl: volumeMl,
        pureAlcoholMl,
        percentageOfTarget: 0,
        timeAllocatedMinutes: 0,
        intervalMinutes: 0,
        quantity: timelineQuantity,
        unit: drink.unit,
      });
    });

    // Step 3: Adjust target if drinks exceed 100%
    const totalPureAlcoholFromDrinks = calculations.reduce((sum, calc) => sum + calc.pureAlcoholMl, 0);
    const progressPercentage =
      totalPureAlcoholNeeded > 0 ? (totalPureAlcoholFromDrinks / totalPureAlcoholNeeded) * 100 : 0;

    const adjustedTarget =
      progressPercentage > 100 ? (progressPercentage / 100) * totalPureAlcoholNeeded : totalPureAlcoholNeeded;

    const isTargetAdjusted = progressPercentage > 100;

    // Step 4: Recompute percentages and times against the adjusted target
    calculations.forEach((calc) => {
      calc.percentageOfTarget = (calc.pureAlcoholMl / adjustedTarget) * 100;
      calc.timeAllocatedMinutes = (calc.percentageOfTarget / 100) * totalTimeDeltaMinutes;
      calc.intervalMinutes = calc.timeAllocatedMinutes / calc.quantity;
    });

    // Step 5: Generate timeline entries
    const timeline: DrinkTimelineEntry[] = [];
    let currentTime = new Date(drinkingStartTime);

    calculations.forEach((calc) => {
      const drinkData = allDrinks.find((d) => d.name === calc.drinkName);
      const category = drinkData?.category || "";
      const icon = getDrinkIcon(category);

      for (let i = 1; i <= calc.quantity; i++) {
        let displayName: string;
        if ((calc.unit === "ml" || calc.unit === "oz") && calc.quantity > 1) {
          const portionSize = Math.round(calc.totalVolumeMl / calc.quantity);
          displayName = `${portionSize}${calc.unit} ${calc.drinkName}`;
        } else if (calc.unit === "ml" || calc.unit === "oz") {
          displayName = `${calc.totalVolumeMl.toFixed(0)}${calc.unit} ${calc.drinkName}`;
        } else {
          displayName = calc.drinkName;
        }

        timeline.push({
          drinkId: calc.drinkId,
          drinkName: displayName,
          unitNumber: i,
          totalUnits: calc.quantity,
          time: new Date(currentTime),
          pureAlcoholMl: calc.pureAlcoholMl / calc.quantity,
          percentageOfTarget: calc.percentageOfTarget / calc.quantity,
          icon,
          unit: calc.unit,
        });

        // Advance the cursor unless this is the very last entry
        if (i < calc.quantity || calc !== calculations[calculations.length - 1]) {
          currentTime = calculateTimeWithMidnight(currentTime, calc.intervalMinutes);
        }
      }
    });

    setState((prev) => ({
      ...prev,
      drinkCalculations: calculations,
      drinkTimeline: timeline,
      adjustedTargetMl: isTargetAdjusted ? adjustedTarget : null,
      isTargetAdjusted: isTargetAdjusted,
    }));
  };

  // Auto-recalculate timeline when dependencies change
  useEffect(() => {
    calculateDrinkTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.drinks,
    state.userMetrics.weight,
    state.userMetrics.weightUnit,
    state.userMetrics.heightCm,
    state.userMetrics.heightFt,
    state.userMetrics.heightIn,
    state.userMetrics.heightUnit,
    state.userMetrics.age,
    state.userMetrics.sex,
    state.userMetrics.metricType,
    state.userMetrics.bodyFat,
    state.timeDelta,
    state.drinkingStartTime,
    state.targetBAC,
  ]);

  return (
    <AppContext.Provider
      value={{
        state,
        updateUserMetrics,
        updateInebriationLevel,
        updateDrinks,
        updateTimeline,
        updateStartTime,
        updateDrinkingStartTime,
        updateDrinkingTargetTime,
        toggleLockedDrink,
        clearLockedDrinks,
        recalculate,
        calculateDrinkTimeline,
        reorderTimelineEntries,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
};
