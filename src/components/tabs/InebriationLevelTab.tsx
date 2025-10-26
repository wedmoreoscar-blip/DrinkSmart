import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useAppContext } from "@/contexts/AppContext";
import { ArrowRight, Clock } from "lucide-react";
import { buzzLevels } from "@/data/buzzLevels";
import { TimePicker } from "@/components/ui/time-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";

const InebriationLevelTab = ({ onNext }: { onNext: () => void }) => {
  const { state, updateInebriationLevel, updateDrinkingStartTime, updateDrinkingTargetTime } = useAppContext();
  const [localLevel, setLocalLevel] = useState(state.inebriationLevel);
  const [timeError, setTimeError] = useState<string>("");
  
  const currentDescription = buzzLevels[localLevel - 1];
  
  const handleSliderChange = (value: number[]) => {
    setLocalLevel(value[0]);
    updateInebriationLevel(value[0]);
  };

  // Calculate gradient color based on level
  const getSliderGradient = () => {
    if (localLevel <= 3) return "from-green-500 to-yellow-500";
    if (localLevel <= 6) return "from-yellow-500 to-orange-500";
    return "from-orange-500 to-red-500";
  };

  const getTextColor = () => {
    if (localLevel <= 3) return "text-green-600 dark:text-green-400";
    if (localLevel <= 6) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const handleStartTimeChange = (date: Date) => {
    updateDrinkingStartTime(date);
    validateTimes(date, state.drinkingTargetTime);
  };

  const handleTargetTimeChange = (date: Date) => {
    updateDrinkingTargetTime(date);
    validateTimes(state.drinkingStartTime, date);
  };

  const validateTimes = (start: Date | null, target: Date | null) => {
    if (start && target && target <= start) {
      setTimeError("Target time must be after start time");
    } else {
      setTimeError("");
    }
  };

  const handleSetNow = () => {
    const now = new Date();
    updateDrinkingStartTime(now);
    validateTimes(now, state.drinkingTargetTime);
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "Not set";
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">How Drunk?</h2>
        <p className="text-muted-foreground">
          Slide to choose your target buzz level
        </p>
      </div>

      <Card className="p-8 md:p-12 space-y-10">
        {/* Large Number Display */}
        <div className="text-center space-y-4">
          <div className={`text-8xl md:text-9xl font-bold font-mono transition-colors duration-300 ${getTextColor()}`}>
            {localLevel}
          </div>
          <div className="space-y-2">
            <h3 className={`text-2xl md:text-3xl font-semibold transition-colors duration-300 ${getTextColor()}`}>
              {currentDescription.label}
            </h3>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              {currentDescription.desc}
            </p>
          </div>
        </div>

        {/* Interactive Slider */}
        <div className="space-y-6 px-4">
          <div className="relative">
            <div className={`absolute inset-0 h-3 rounded-full bg-gradient-to-r ${getSliderGradient()} opacity-20 blur-sm`}></div>
            <Slider
              value={[localLevel]}
              onValueChange={handleSliderChange}
              min={1}
              max={10}
              step={1}
              className="relative"
            />
          </div>
          
          {/* Scale Labels */}
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
            <span>6</span>
            <span>7</span>
            <span>8</span>
            <span>9</span>
            <span>10</span>
          </div>
        </div>

        {/* Responsible Drinking Note */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground italic">
            Remember: Know your limits, stay safe, and never drink and drive
          </p>
        </div>
      </Card>

      {/* Timing Section */}
      <Card className="p-6 md:p-8 space-y-6">
        <div className="space-y-6">
          {/* Start Time */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Start Time
              </h3>
              <p className="text-sm text-muted-foreground">
                When do you wanna start drinking?
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <TimePicker
                value={state.drinkingStartTime}
                onChange={handleStartTimeChange}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSetNow}
              >
                Now
              </Button>
              {state.drinkingStartTime && (
                <span className="text-sm text-muted-foreground">
                  {formatTime(state.drinkingStartTime)}
                </span>
              )}
            </div>
          </div>

          {/* Target/Peak Time */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Target/Peak Time
              </h3>
              <p className="text-sm text-muted-foreground">
                When do you want to reach your buzz?
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <TimePicker
                value={state.drinkingTargetTime}
                onChange={handleTargetTimeChange}
              />
              {state.drinkingTargetTime && (
                <span className="text-sm text-muted-foreground">
                  {formatTime(state.drinkingTargetTime)}
                </span>
              )}
            </div>
          </div>

          {/* Error Message */}
          {timeError && (
            <Alert variant="destructive">
              <AlertDescription>{timeError}</AlertDescription>
            </Alert>
          )}
        </div>
      </Card>

      {/* Next Button */}
      <div className="flex justify-end">
        <Button size="lg" onClick={onNext} disabled={!!timeError}>
          Next: User Info
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default InebriationLevelTab;
