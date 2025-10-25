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
  drinks: DrinkEntry[];
  startTime: number; // seconds since start (deprecated)
  isTimerRunning: boolean; // deprecated
  startDateTime: Date | null; // actual start time
};

type AppContextType = {
  state: AppState;
  updateUserMetrics: (metrics: Partial<UserMetrics>) => void;
  updateInebriationLevel: (level: number) => void;
  updateDrinks: (drinks: DrinkEntry[]) => void;
  updateTimeline: (startTime: number, isRunning: boolean) => void;
  updateStartTime: (startTime: Date) => void;
  recalculate: () => void;
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
  drinks: [{ id: "1", category: "", drink: "", quantity: "", unit: "ml" }],
  startTime: 0,
  isTimerRunning: false,
  startDateTime: null,
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
    setState((prev) => ({ ...prev, inebriationLevel: level }));
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

  const recalculate = () => {
    // This will trigger recalculation in the Results tab
    // For now, it's a placeholder - actual calculations will be implemented later
    console.log("Recalculating with current state:", state);
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
        recalculate,
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
