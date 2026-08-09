import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClockTimePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  className?: string;
}

const MINUTE_STOPS = [0, 15, 30, 45];

export function ClockTimePicker({ value, onChange, className }: ClockTimePickerProps) {
  const currentDate = value || new Date(new Date().setHours(0, 0, 0, 0));
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  const hours = currentDate.getHours();
  const minuteStop = MINUTE_STOPS[Math.floor(currentDate.getMinutes() / 15)];

  // Create continuous list by adding copies before and after
  const baseHoursList = Array.from({ length: 24 }, (_, i) => i);
  const baseMinutesList = MINUTE_STOPS;

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

  // Styling by distance from the selected row
  const getItemClass = (itemValue: number, currentValue: number, maxValue: number, step: number) => {
    const normalizedItem = itemValue % maxValue;
    const distance = Math.abs(normalizedItem - currentValue);
    const cyclicDistance = Math.min(distance, maxValue - distance);
    if (cyclicDistance === 0) return "text-title font-medium text-foreground";
    if (cyclicDistance === step) return "text-lead text-[#75798c]";
    return "opacity-0";
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
      const middleIndex = MINUTE_STOPS.length + MINUTE_STOPS.indexOf(minuteStop); // Second copy + current stop
      const selectedMinute = minutesRef.current.children[middleIndex] as HTMLElement;
      if (selectedMinute) {
        selectedMinute.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div className="relative flex h-[168px] gap-2">
        {/* Fixed 56px accent selection band spanning both columns */}
        <div className="pointer-events-none absolute inset-x-[-8px] top-[56px] h-tap rounded-ctl bg-accent shadow-[0_0_0_1px_hsl(var(--ring))]" />

        {/* Hours column */}
        <ScrollArea className="h-full flex-1">
          <div ref={hoursRef} className="py-14 tabular-nums">
            {hoursList.map((hour, index) => (
              <button
                key={`hour-${index}`}
                data-value={hour % 24}
                onClick={() => handleHourChange(hour)}
                className={cn(
                  "flex h-tap w-full items-center justify-center transition-colors",
                  getItemClass(hour, hours, 24, 1)
                )}
              >
                {(hour % 24).toString().padStart(2, "0")}
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Minutes column - 15-minute stops only */}
        <ScrollArea className="h-full flex-1">
          <div ref={minutesRef} className="py-14 tabular-nums">
            {minutesList.map((minute, index) => (
              <button
                key={`minute-${index}`}
                data-value={minute % 60}
                onClick={() => handleMinuteChange(minute)}
                className={cn(
                  "flex h-tap w-full items-center justify-center transition-colors",
                  getItemClass(minute, minuteStop, 60, 15)
                )}
              >
                {(minute % 60).toString().padStart(2, "0")}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* One-tap Now control */}
      <button
        type="button"
        onClick={() => onChange(new Date())}
        className="mt-3 flex h-tap w-full items-center justify-center rounded-ctl text-body text-foreground shadow-[0_0_0_1px_hsl(var(--border))]"
      >
        Now
      </button>
    </div>
  );
}
