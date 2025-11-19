import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useAppContext } from "@/contexts/AppContext";
import { ArrowRight, Clock, Save } from "lucide-react";
import { buzzLevels } from "@/data/buzzLevels";
import { TimePicker } from "@/components/ui/time-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";

const InebriationLevelTab = ({ onNext }: { onNext: () => void }) => {
  const { state, updateInebriationLevel, updateDrinkingStartTime, updateDrinkingTargetTime } = useAppContext();
  const [localLevel, setLocalLevel] = useState(state.inebriationLevel);
  const [timeError, setTimeError] = useState<string>("");
  
  // Local state for times - defaults to 00:00 if not set
  const [localStartTime, setLocalStartTime] = useState<Date>(
    state.drinkingStartTime || new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [localTargetTime, setLocalTargetTime] = useState<Date>(
    state.drinkingTargetTime || new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [timeWarning, setTimeWarning] = useState<string>("");
  
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
    setLocalStartTime(date);
    setHasUnsavedChanges(true);
    validateTimes(date, localTargetTime);
  };

  const handleTargetTimeChange = (date: Date) => {
    setLocalTargetTime(date);
    setHasUnsavedChanges(true);
    validateTimes(localStartTime, date);
  };

  const validateTimes = (start: Date, target: Date) => {
    // Calculate time delta using the same logic as AppContext
    const startHour = start.getHours();
    const startMinutes = start.getMinutes();
    const targetHour = target.getHours();
    const targetMinutes = target.getMinutes();
    
    const startTotalMinutes = startHour * 60 + startMinutes;
    const targetTotalMinutes = targetHour * 60 + targetMinutes;
    
    let diffMinutes: number;
    
    // Check if times are exactly the same
    if (startTotalMinutes === targetTotalMinutes) {
      setTimeWarning("⚠️ Start and target times are the same. Time difference is 0 hours.");
      setTimeError("Target time must be after start time");
      return;
    }
    
    if (targetTotalMinutes < startTotalMinutes) {
      diffMinutes = (24 * 60 - startTotalMinutes) + targetTotalMinutes;
      // Target time is earlier in the day, so it's treated as next day
      setTimeWarning("⚠️ Target time is earlier than start time - treating it as next day (crossing midnight).");
    } else {
      diffMinutes = targetTotalMinutes - startTotalMinutes;
      
      // Health and safety warning for rapid consumption
      if (diffMinutes <= 30 && localLevel > 4) {
        setTimeWarning("⚠️ HEALTH WARNING: Reaching buzz level " + localLevel + " in 30 minutes or less can be dangerous. Please drink responsibly and consider extending your timeframe.");
      } else {
        setTimeWarning("");
      }
    }
    
    const timeDeltaHours = diffMinutes / 60;
    
    // Error check
    if (timeDeltaHours <= 0) {
      setTimeError("Target time must be after start time");
    } else {
      setTimeError("");
    }
  };

  const handleSetNow = () => {
    const now = new Date();
    // Round to nearest minute for comparison
    now.setSeconds(0, 0);
    setLocalStartTime(now);
    setHasUnsavedChanges(true);
    validateTimes(now, localTargetTime);
  };

  const isStartTimeNow = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    const start = new Date(localStartTime);
    start.setSeconds(0, 0);
    // Check if within same minute
    return Math.abs(now.getTime() - start.getTime()) < 60000;
  };

  const handleSaveTimes = () => {
    if (timeError) return;
    
    updateDrinkingStartTime(localStartTime);
    updateDrinkingTargetTime(localTargetTime);
    setHasUnsavedChanges(false);
    
    toast({
      title: "Times saved",
      description: "Your drinking schedule has been saved.",
      duration: 3000,
    });
  };

  const handlePresetTime = (hours: number) => {
    const newTargetTime = new Date(localStartTime);
    newTargetTime.setHours(newTargetTime.getHours() + hours);
    setLocalTargetTime(newTargetTime);
    setHasUnsavedChanges(true);
    validateTimes(localStartTime, newTargetTime);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
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

        {/* Update Button and Responsible Drinking Note */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <Button 
              onClick={() => {
                updateInebriationLevel(localLevel);
                toast({
                  title: "Buzz level updated",
                  description: `Your target buzz level has been set to ${localLevel}.`,
                  duration: 3000,
                });
              }}
              variant="outline"
              size="sm"
            >
              Update Buzz Level
            </Button>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground italic">
              Remember: Know your limits, stay safe, and never drink and drive
            </p>
          </div>
        </div>
      </Card>

      {/* Timing Section */}
      <Card className="p-6 md:p-8 space-y-6">
        <div className="space-y-6">
          {/* Time Selection - Side by Side */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Start Time */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Start Time
                </h3>
                <p className="text-xs text-muted-foreground">
                  When do you want to start drinking?
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-center">
                  <TimePicker
                    value={localStartTime}
                    onChange={handleStartTimeChange}
                  />
                </div>
                <div className="flex items-center justify-center">
                  <Button 
                    variant={isStartTimeNow() ? "default" : "outline"}
                    size="sm"
                    onClick={handleSetNow}
                    className={isStartTimeNow() ? "bg-primary" : ""}
                  >
                    Now
                  </Button>
                </div>
              </div>
            </div>

            {/* Target/Peak Time */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Target Time
                </h3>
                <p className="text-xs text-muted-foreground">
                  When do you want to reach your buzz?
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-center">
                  <TimePicker
                    value={localTargetTime}
                    onChange={handleTargetTimeChange}
                  />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetTime(1)}
                  >
                    +1hr
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetTime(2)}
                  >
                    +2hrs
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetTime(4)}
                  >
                    +4hrs
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          {timeWarning && (
            <Alert>
              <AlertDescription>{timeWarning}</AlertDescription>
            </Alert>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveTimes}
              disabled={!!timeError || !hasUnsavedChanges}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save Times {hasUnsavedChanges && "*"}
            </Button>
          </div>
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
