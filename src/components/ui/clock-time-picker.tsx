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

  const hoursList = Array.from({ length: 24 }, (_, i) => i);
  const minutesList = Array.from({ length: 60 }, (_, i) => i);

  const handleHourChange = (hour: number) => {
    const newDate = new Date(currentDate);
    newDate.setHours(hour);
    onChange(newDate);
  };

  const handleMinuteChange = (minute: number) => {
    const newDate = new Date(currentDate);
    newDate.setMinutes(minute);
    onChange(newDate);
  };

  // Scroll to selected value on mount
  useEffect(() => {
    if (hoursRef.current) {
      const selectedHour = hoursRef.current.querySelector(`[data-value="${hours}"]`);
      if (selectedHour) {
        selectedHour.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }
    if (minutesRef.current) {
      const selectedMinute = minutesRef.current.querySelector(`[data-value="${minutes}"]`);
      if (selectedMinute) {
        selectedMinute.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center justify-center gap-2">
        {/* Hours column */}
        <div className="relative">
          <ScrollArea className="h-48 w-20 rounded-lg border">
            <div ref={hoursRef} className="py-20">
              {hoursList.map((hour) => (
                <button
                  key={hour}
                  data-value={hour}
                  onClick={() => handleHourChange(hour)}
                  className={cn(
                    "w-full h-12 flex items-center justify-center text-lg font-medium transition-all",
                    "hover:bg-muted",
                    hours === hour
                      ? "text-primary font-bold scale-110"
                      : "text-muted-foreground"
                  )}
                >
                  {hour.toString().padStart(2, "0")}
                </button>
              ))}
            </div>
          </ScrollArea>
          {/* Selection indicator */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 border-y-2 border-primary/20 pointer-events-none" />
        </div>

        <span className="text-2xl font-bold">:</span>

        {/* Minutes column */}
        <div className="relative">
          <ScrollArea className="h-48 w-20 rounded-lg border">
            <div ref={minutesRef} className="py-20">
              {minutesList.map((minute) => (
                <button
                  key={minute}
                  data-value={minute}
                  onClick={() => handleMinuteChange(minute)}
                  className={cn(
                    "w-full h-12 flex items-center justify-center text-lg font-medium transition-all",
                    "hover:bg-muted",
                    minutes === minute
                      ? "text-primary font-bold scale-110"
                      : "text-muted-foreground"
                  )}
                >
                  {minute.toString().padStart(2, "0")}
                </button>
              ))}
            </div>
          </ScrollArea>
          {/* Selection indicator */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 border-y-2 border-primary/20 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
