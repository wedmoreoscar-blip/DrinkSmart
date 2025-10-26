import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type MetricType = "bmi" | "ffmi";
type HeightUnit = "cm" | "ft";
type WeightUnit = "kg" | "lbs";

type DrinkEntry = {
  id: string;
  category: string;
  drink: string;
  customABV?: string;
  quantity: string;
  unit: "ml" | "oz" | "shots" | "pints";
  mixer?: string;
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
  startTime: number; // seconds since start (deprecated)
  isTimerRunning: boolean; // deprecated
  startDateTime: Date | null; // actual start time
  drinkingStartTime: Date | null; // when user starts drinking
  drinkingTargetTime: Date | null; // when user wants to reach their buzz
  timeDelta: number | null; // difference between start and target time in hours (float)
  drinkTimeline: DrinkTimelineEntry[]; // calculated timeline entries
  drinkCalculations: DrinkCalculation[]; // calculation details for each drink
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
  recalculate: () => void;
  calculateDrinkTimeline: () => void;
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
  drinks: [{ id: "1", category: "", drink: "", quantity: "", unit: "ml" }],
  startTime: 0,
  isTimerRunning: false,
  startDateTime: null,
  drinkingStartTime: null,
  drinkingTargetTime: null,
  timeDelta: null,
  drinkTimeline: [],
  drinkCalculations: [],
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(initialState);

  const updateUserMetrics = (metrics: Partial<UserMetrics>) => {
    setState((prev) => ({
      ...prev,
      userMetrics: { ...prev.userMetrics, ...metrics },
    }));
  };

  const updateInebriationLevel = (level: number) => {
    // Import buzzLevels dynamically to get BAC range
    import("@/data/buzzLevels").then(({ getBACForLevel }) => {
      const bacRange = getBACForLevel(level);
      setState((prev) => ({ 
        ...prev, 
        inebriationLevel: level,
        targetBAC: { min: bacRange.min_bac, max: bacRange.max_bac }
      }));
    });
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
    
    // Check if we're crossing midnight
    const startHour = startTime.getHours();
    const startMinutes = startTime.getMinutes();
    const targetHour = targetTime.getHours();
    const targetMinutes = targetTime.getMinutes();
    
    let adjustedTarget = new Date(targetTime);
    
    // If target time appears earlier in the day, assume it's the next day
    if (targetHour < startHour || (targetHour === startHour && targetMinutes <= startMinutes)) {
      adjustedTarget = new Date(targetTime);
      adjustedTarget.setDate(adjustedTarget.getDate() + 1);
    }
    
    const diffMs = adjustedTarget.getTime() - startTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours;
  };

  const updateDrinkingStartTime = (time: Date | null) => {
    setState((prev) => {
      const timeDelta = calculateTimeDelta(time, prev.drinkingTargetTime);
      return { ...prev, drinkingStartTime: time, timeDelta };
    });
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

  const calculateDrinkTimeline = () => {
    const { userMetrics, targetBAC, timeDelta, drinks, drinkingStartTime } = state;
    
    // Check if we have all required data
    if (!userMetrics.weight || !userMetrics.sex || timeDelta === null || !drinkingStartTime) {
      setState((prev) => ({ ...prev, drinkTimeline: [], drinkCalculations: [] }));
      return;
    }

    // Import drink data and helpers
    import("@/data/drinksData").then(({ drinkCategories }) => {
      import("@/lib/timelineHelpers").then(({ convertToMl, getDrinkIcon, calculateTimeWithMidnight }) => {
        // Flatten all drinks for lookup
        const allDrinks = Object.entries(drinkCategories).flatMap(([categoryKey, category]) =>
          category.options.map(option => ({
            name: option.name,
            abv: option.abv,
            category: categoryKey,
          }))
        );

        // Step 1: Calculate total pure alcohol needed
        let weightInGrams: number;
        if (userMetrics.weightUnit === "kg") {
          weightInGrams = parseFloat(userMetrics.weight) * 1000;
        } else {
          weightInGrams = parseFloat(userMetrics.weight) * 453.592;
        }

        const R = userMetrics.sex === "male" ? 0.68 : 0.55;
        const BAC = (targetBAC.min + targetBAC.max) / 2;
        const pureAlcoholGrams = (BAC / 100 + (0.00015 * timeDelta)) * weightInGrams * R;
        const totalPureAlcoholNeeded = pureAlcoholGrams / 0.789;

        const totalTimeDeltaMinutes = timeDelta * 60;

        // Step 2: Process each drink
        const calculations: DrinkCalculation[] = [];
        
        drinks.forEach((drink) => {
          if (!drink.drink || !drink.quantity) return;

          const quantity = parseFloat(drink.quantity);
          if (isNaN(quantity) || quantity <= 0) return;

          // Convert to ml
          const volumeMl = convertToMl(quantity, drink.unit);

          // Get ABV
          const drinkData = allDrinks.find(d => d.name === drink.drink);
          const abv = drink.customABV ? parseFloat(drink.customABV) : (drinkData?.abv || 0);

          // Calculate pure alcohol
          const pureAlcoholMl = volumeMl * (abv / 100);

          // Calculate percentage of target
          const percentageOfTarget = (pureAlcoholMl / totalPureAlcoholNeeded) * 100;

          // Calculate time allocated
          const timeAllocatedMinutes = (percentageOfTarget / 100) * totalTimeDeltaMinutes;

          // Calculate interval per unit
          const intervalMinutes = timeAllocatedMinutes / quantity;

          calculations.push({
            drinkId: drink.id,
            drinkName: drink.drink,
            totalVolumeMl: volumeMl,
            pureAlcoholMl,
            percentageOfTarget,
            timeAllocatedMinutes,
            intervalMinutes,
            quantity,
            unit: drink.unit,
          });
        });

        // Step 3: Generate timeline entries
        const timeline: DrinkTimelineEntry[] = [];
        let currentTime = new Date(drinkingStartTime);

        calculations.forEach((calc) => {
          const drinkData = allDrinks.find(d => d.name === calc.drinkName);
          const category = drinkData?.category || "";
          const icon = getDrinkIcon(category);

          for (let i = 1; i <= calc.quantity; i++) {
            timeline.push({
              drinkId: calc.drinkId,
              drinkName: calc.drinkName,
              unitNumber: i,
              totalUnits: calc.quantity,
              time: new Date(currentTime),
              pureAlcoholMl: calc.pureAlcoholMl / calc.quantity,
              percentageOfTarget: calc.percentageOfTarget / calc.quantity,
              icon,
              unit: calc.unit,
            });

            // Move to next time slot (except for last entry)
            if (i < calc.quantity || calc !== calculations[calculations.length - 1]) {
              currentTime = calculateTimeWithMidnight(currentTime, calc.intervalMinutes);
            }
          }
        });

        // Step 4: Store calculations
        setState((prev) => ({
          ...prev,
          drinkCalculations: calculations,
          drinkTimeline: timeline,
        }));
      });
    });
  };

  // Auto-recalculate timeline when dependencies change
  useEffect(() => {
    calculateDrinkTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.drinks,
    state.userMetrics.weight,
    state.userMetrics.sex,
    state.userMetrics.weightUnit,
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
        recalculate,
        calculateDrinkTimeline,
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
