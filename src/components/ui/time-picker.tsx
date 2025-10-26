import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const currentDate = value || new Date(new Date().setHours(0, 0, 0, 0));
  
  // Extract hours (0-23) and minutes
  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();

  const handleHourChange = (hour: string) => {
    const newDate = new Date(currentDate);
    newDate.setHours(parseInt(hour));
    onChange(newDate);
  };

  const handleMinuteChange = (minute: string) => {
    const newDate = new Date(currentDate);
    newDate.setMinutes(parseInt(minute));
    onChange(newDate);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Hours */}
      <Select value={hours.toString()} onValueChange={handleHourChange}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent side="top" className="bg-background z-50">
          {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
            <SelectItem key={hour} value={hour.toString()}>
              {hour.toString().padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-2xl font-semibold">:</span>

      {/* Minutes */}
      <Select value={minutes.toString()} onValueChange={handleMinuteChange}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent side="top" className="bg-background z-50">
          {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
            <SelectItem key={minute} value={minute.toString()}>
              {minute.toString().padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
