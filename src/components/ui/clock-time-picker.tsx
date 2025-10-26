import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClockTimePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  className?: string;
}

export function ClockTimePicker({ value, onChange, className }: ClockTimePickerProps) {
  const currentDate = value || new Date(new Date().setHours(0, 0, 0, 0));
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  
  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();

  // Create continuous list by adding copies before and after
  const baseHoursList = Array.from({ length: 24 }, (_, i) => i);
  const baseMinutesList = Array.from({ length: 60 }, (_, i) => i);
  
  // Triple the arrays for continuous scrolling
  const hoursList = [...baseHoursList, ...baseHoursList, ...baseHoursList];
  const minutesList = [...baseMinutesList, ...baseMinutesList, ...baseMinutesList];

  const handleHourChange = (hour: number) => {
    const newDate = new Date(currentDate);
    newDate.setHours(hour % 24);
    onChange(newDate);
  };

  const handleMinuteChange = (minute: number) => {
    const newDate = new Date(currentDate);
    newDate.setMinutes(minute % 60);
    onChange(newDate);
  };

  // Calculate distance from center for styling
  const getItemStyle = (itemValue: number, currentValue: number, maxValue: number) => {
    const normalizedItem = itemValue % maxValue;
    const distance = Math.abs(normalizedItem - currentValue);
    const isSelected = distance === 0;
    
    return {
      opacity: isSelected ? 1 : distance === 1 ? 0.4 : 0.2,
      fontSize: isSelected ? "1rem" : distance === 1 ? "0.875rem" : "0.75rem",
      fontWeight: isSelected ? "bold" : "normal",
    };
  };

  // Scroll to selected value on mount - scroll to middle copy
  useEffect(() => {
    if (hoursRef.current) {
      const middleIndex = 24 + hours; // Second copy + current hour
      const selectedHour = hoursRef.current.children[middleIndex] as HTMLElement;
      if (selectedHour) {
        selectedHour.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }
    if (minutesRef.current) {
      const middleIndex = 60 + minutes; // Second copy + current minute
      const selectedMinute = minutesRef.current.children[middleIndex] as HTMLElement;
      if (selectedMinute) {
        selectedMinute.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center justify-center gap-1">
        {/* Hours column */}
        <div className="relative">
          <ScrollArea className="h-32 w-14 rounded-md border">
            <div ref={hoursRef} className="py-12">
              {hoursList.map((hour, index) => {
                const style = getItemStyle(hour, hours, 24);
                return (
                  <button
                    key={`hour-${index}`}
                    data-value={hour % 24}
                    onClick={() => handleHourChange(hour)}
                    className={cn(
                      "w-full h-8 flex items-center justify-center transition-all",
                      "hover:bg-muted"
                    )}
                    style={style}
                  >
                    {(hour % 24).toString().padStart(2, "0")}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          {/* Selection indicator */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 border-y border-primary/30 pointer-events-none bg-primary/5" />
        </div>

        <span className="text-lg font-bold">:</span>

        {/* Minutes column */}
        <div className="relative">
          <ScrollArea className="h-32 w-14 rounded-md border">
            <div ref={minutesRef} className="py-12">
              {minutesList.map((minute, index) => {
                const style = getItemStyle(minute, minutes, 60);
                return (
                  <button
                    key={`minute-${index}`}
                    data-value={minute % 60}
                    onClick={() => handleMinuteChange(minute)}
                    className={cn(
                      "w-full h-8 flex items-center justify-center transition-all",
                      "hover:bg-muted"
                    )}
                    style={style}
                  >
                    {(minute % 60).toString().padStart(2, "0")}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          {/* Selection indicator */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 border-y border-primary/30 pointer-events-none bg-primary/5" />
        </div>
      </div>
    </div>
  );
}
