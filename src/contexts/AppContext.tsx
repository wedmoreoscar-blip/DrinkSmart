import { createContext, useContext, useState, ReactNode } from "react";

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

export type DrinkPreset = {
  name: string;
  quantity: number;
  unit: "shots" | "pints" | "glasses";
  volumeMl: number;
  abv: number;
  pureAlcoholMl: number;
  percentageOfTarget: number;
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
  drinkPresets: DrinkPreset[]; // calculated percentages for common drink presets
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
  calculateDrinkPresets: () => void;
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
  drinkPresets: [],
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
    // For now, it's a placeholder - actual calculations will be implemented later
    console.log("Recalculating with current state:", state);
  };

  const calculateDrinkPresets = () => {
    const { userMetrics, targetBAC, timeDelta } = state;
    
    // Check if we have all required data
    if (!userMetrics.weight || !userMetrics.sex || timeDelta === null) {
      console.log("Cannot calculate presets - missing required data");
      return;
    }

    // Convert weight to grams
    let weightInGrams: number;
    if (userMetrics.weightUnit === "kg") {
      weightInGrams = parseFloat(userMetrics.weight) * 1000;
    } else {
      weightInGrams = parseFloat(userMetrics.weight) * 453.592;
    }

    const R = userMetrics.sex === "male" ? 0.68 : 0.55;
    const BAC = (targetBAC.min + targetBAC.max) / 2;
    const pureAlcoholGrams = (BAC / 100 + (0.00015 * timeDelta)) * weightInGrams * R;
    const totalPureAlcoholMl = pureAlcoholGrams / 0.789;

    // Define drink presets with their properties
    const SHOT_ML = 30;
    const PINT_ML = 568;
    const GLASS_ML = 175;
    const VODKA_ABV = 37.5;
    const BEER_ABV = 5;
    const WINE_ABV = 12;

    const presetDefinitions = [
      // Vodka shots
      { name: "1 Shot Vodka", quantity: 1, unit: "shots" as const, volumeMl: SHOT_ML, abv: VODKA_ABV },
      { name: "2 Shots Vodka", quantity: 2, unit: "shots" as const, volumeMl: SHOT_ML * 2, abv: VODKA_ABV },
      { name: "3 Shots Vodka", quantity: 3, unit: "shots" as const, volumeMl: SHOT_ML * 3, abv: VODKA_ABV },
      { name: "5 Shots Vodka", quantity: 5, unit: "shots" as const, volumeMl: SHOT_ML * 5, abv: VODKA_ABV },
      { name: "10 Shots Vodka", quantity: 10, unit: "shots" as const, volumeMl: SHOT_ML * 10, abv: VODKA_ABV },
      
      // Beer pints
      { name: "1 Pint Beer", quantity: 1, unit: "pints" as const, volumeMl: PINT_ML, abv: BEER_ABV },
      { name: "2 Pints Beer", quantity: 2, unit: "pints" as const, volumeMl: PINT_ML * 2, abv: BEER_ABV },
      { name: "3 Pints Beer", quantity: 3, unit: "pints" as const, volumeMl: PINT_ML * 3, abv: BEER_ABV },
      { name: "5 Pints Beer", quantity: 5, unit: "pints" as const, volumeMl: PINT_ML * 5, abv: BEER_ABV },
      { name: "10 Pints Beer", quantity: 10, unit: "pints" as const, volumeMl: PINT_ML * 10, abv: BEER_ABV },
      
      // Wine glasses
      { name: "1 Glass Wine", quantity: 1, unit: "glasses" as const, volumeMl: GLASS_ML, abv: WINE_ABV },
      { name: "2 Glasses Wine", quantity: 2, unit: "glasses" as const, volumeMl: GLASS_ML * 2, abv: WINE_ABV },
      { name: "3 Glasses Wine", quantity: 3, unit: "glasses" as const, volumeMl: GLASS_ML * 3, abv: WINE_ABV },
      { name: "5 Glasses Wine", quantity: 5, unit: "glasses" as const, volumeMl: GLASS_ML * 5, abv: WINE_ABV },
      { name: "10 Glasses Wine", quantity: 10, unit: "glasses" as const, volumeMl: GLASS_ML * 10, abv: WINE_ABV },
    ];

    // Calculate percentage for each preset
    const calculatedPresets: DrinkPreset[] = presetDefinitions.map(preset => {
      const pureAlcoholMl = preset.volumeMl * (preset.abv / 100);
      const percentageOfTarget = (pureAlcoholMl / totalPureAlcoholMl) * 100;

      return {
        ...preset,
        pureAlcoholMl,
        percentageOfTarget: Math.round(percentageOfTarget * 10) / 10, // Round to 1 decimal
      };
    });

    // Update state
    setState(prev => ({ ...prev, drinkPresets: calculatedPresets }));
    
    // Save to localStorage
    localStorage.setItem('drinkPresets', JSON.stringify(calculatedPresets));
    
    console.log("Drink presets calculated:", calculatedPresets);
  };

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
        calculateDrinkPresets,
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
