import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface ClockTimePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  className?: string;
}

export function ClockTimePicker({ value, onChange, className }: ClockTimePickerProps) {
  const currentDate = value || new Date(new Date().setHours(0, 0, 0, 0));
  const [mode, setMode] = useState<"hours" | "minutes">("hours");
  
  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();

  const handleHourClick = (hour: number) => {
    const newDate = new Date(currentDate);
    newDate.setHours(hour);
    onChange(newDate);
    setMode("minutes");
  };

  const handleMinuteClick = (minute: number) => {
    const newDate = new Date(currentDate);
    newDate.setMinutes(minute);
    onChange(newDate);
  };

  const renderClock = () => {
    const isHoursMode = mode === "hours";
    const maxValue = isHoursMode ? 24 : 60;
    const currentValue = isHoursMode ? hours : minutes;
    const step = isHoursMode ? 1 : 5;
    
    const numbers = [];
    for (let i = 0; i < maxValue; i += step) {
      numbers.push(i);
    }

    return (
      <div className="relative w-64 h-64 mx-auto">
        {/* Clock circle */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 bg-background/50" />
        
        {/* Center display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl font-bold font-mono">
              {hours.toString().padStart(2, "0")}:{minutes.toString().padStart(2, "0")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {isHoursMode ? "Select hour" : "Select minute"}
            </div>
          </div>
        </div>

        {/* Numbers around the clock */}
        {numbers.map((num) => {
          const angle = (num / maxValue) * 2 * Math.PI - Math.PI / 2;
          const radius = 100;
          const x = Math.cos(angle) * radius + 128;
          const y = Math.sin(angle) * radius + 128;
          
          const isSelected = num === currentValue;
          
          return (
            <button
              key={num}
              onClick={() => isHoursMode ? handleHourClick(num) : handleMinuteClick(num)}
              className={cn(
                "absolute w-10 h-10 -ml-5 -mt-5 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                "hover:bg-primary hover:text-primary-foreground hover:scale-110",
                isSelected && "bg-primary text-primary-foreground scale-110 shadow-lg"
              )}
              style={{
                left: `${x}px`,
                top: `${y}px`,
              }}
            >
              {num.toString().padStart(2, "0")}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Card className={cn("p-6", className)}>
      <div className="space-y-4">
        {/* Mode toggle buttons */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setMode("hours")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              mode === "hours"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            Hours
          </button>
          <button
            onClick={() => setMode("minutes")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              mode === "minutes"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            Minutes
          </button>
        </div>

        {/* Clock display */}
        {renderClock()}
      </div>
    </Card>
  );
}
