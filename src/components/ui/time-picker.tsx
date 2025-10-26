import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const currentDate = value || new Date();
  
  // Extract hours (1-12), minutes, and period from the date
  const hours24 = currentDate.getHours();
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const minutes = currentDate.getMinutes();
  const period = hours24 >= 12 ? "PM" : "AM";

  const handleHourChange = (hour: string) => {
    const newDate = new Date(currentDate);
    let hour24 = parseInt(hour);
    
    // Convert 12-hour to 24-hour format
    if (period === "PM" && hour24 !== 12) {
      hour24 += 12;
    } else if (period === "AM" && hour24 === 12) {
      hour24 = 0;
    }
    
    newDate.setHours(hour24);
    onChange(newDate);
  };

  const handleMinuteChange = (minute: string) => {
    const newDate = new Date(currentDate);
    newDate.setMinutes(parseInt(minute));
    onChange(newDate);
  };

  const handlePeriodChange = (newPeriod: string) => {
    const newDate = new Date(currentDate);
    let currentHour = newDate.getHours();
    
    if (newPeriod === "PM" && currentHour < 12) {
      newDate.setHours(currentHour + 12);
    } else if (newPeriod === "AM" && currentHour >= 12) {
      newDate.setHours(currentHour - 12);
    }
    
    onChange(newDate);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Hours */}
      <Select value={hours12.toString()} onValueChange={handleHourChange}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
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
        <SelectContent className="bg-background z-50">
          {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
            <SelectItem key={minute} value={minute.toString()}>
              {minute.toString().padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* AM/PM */}
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
