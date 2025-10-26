import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ClockTimePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  className?: string;
}

export function ClockTimePicker({ value, onChange, className }: ClockTimePickerProps) {
  const currentDate = value || new Date(new Date().setHours(0, 0, 0, 0));
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const hoursScrollTimeout = useRef<NodeJS.Timeout>();
  const minutesScrollTimeout = useRef<NodeJS.Timeout>();
  
  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();

  const ITEM_HEIGHT = 40; // Height of each item in pixels
  const VISIBLE_ITEMS = 5; // Number of visible items (center + 2 above + 2 below)

  // Create continuous list by tripling the array
  const baseHoursList = Array.from({ length: 24 }, (_, i) => i);
  const baseMinutesList = Array.from({ length: 60 }, (_, i) => i);
  
  const hoursList = [...baseHoursList, ...baseHoursList, ...baseHoursList];
  const minutesList = [...baseMinutesList, ...baseMinutesList, ...baseMinutesList];

  // Calculate rotation and opacity based on distance from center
  const getItemTransform = (index: number, centerIndex: number) => {
    const distance = index - centerIndex;
    const rotation = distance * 8; // Degrees of rotation per item
    const opacity = Math.max(0, 1 - Math.abs(distance) * 0.3);
    const scale = Math.max(0.7, 1 - Math.abs(distance) * 0.15);
    
    return {
      transform: `rotateX(${-rotation}deg) translateZ(0) scale(${scale})`,
      opacity,
      fontWeight: distance === 0 ? "600" : "400",
    };
  };

  const handleScroll = (
    ref: React.RefObject<HTMLDivElement>,
    totalItems: number,
    currentValue: number,
    onChange: (value: number) => void
  ) => {
    if (!ref.current) return;

    const scrollTop = ref.current.scrollTop;
    const itemIndex = Math.round(scrollTop / ITEM_HEIGHT);
    const normalizedIndex = itemIndex % totalItems;
    
    onChange(normalizedIndex);
  };

  const snapToNearest = (
    ref: React.RefObject<HTMLDivElement>,
    timeoutRef: React.MutableRefObject<NodeJS.Timeout | undefined>
  ) => {
    if (!ref.current) return;

    const scrollTop = ref.current.scrollTop;
    const nearestIndex = Math.round(scrollTop / ITEM_HEIGHT);
    const targetScroll = nearestIndex * ITEM_HEIGHT;

    ref.current.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });
  };

  const handleHourScroll = () => {
    if (hoursScrollTimeout.current) {
      clearTimeout(hoursScrollTimeout.current);
    }
    
    hoursScrollTimeout.current = setTimeout(() => {
      handleScroll(hoursRef, 24, hours, (hour) => {
        const newDate = new Date(currentDate);
        newDate.setHours(hour);
        onChange(newDate);
      });
      snapToNearest(hoursRef, hoursScrollTimeout);
    }, 150);
  };

  const handleMinuteScroll = () => {
    if (minutesScrollTimeout.current) {
      clearTimeout(minutesScrollTimeout.current);
    }
    
    minutesScrollTimeout.current = setTimeout(() => {
      handleScroll(minutesRef, 60, minutes, (minute) => {
        const newDate = new Date(currentDate);
        newDate.setMinutes(minute);
        onChange(newDate);
      });
      snapToNearest(minutesRef, minutesScrollTimeout);
    }, 150);
  };

  // Initialize scroll position to middle copy
  useEffect(() => {
    if (hoursRef.current) {
      const middleIndex = 24 + hours;
      hoursRef.current.scrollTop = middleIndex * ITEM_HEIGHT;
    }
    if (minutesRef.current) {
      const middleIndex = 60 + minutes;
      minutesRef.current.scrollTop = middleIndex * ITEM_HEIGHT;
    }
  }, []);

  // Handle infinite scroll by jumping to middle copy when near edges
  useEffect(() => {
    const handleInfiniteScroll = (ref: React.RefObject<HTMLDivElement>, totalItems: number) => {
      if (!ref.current) return;

      const scrollTop = ref.current.scrollTop;
      const itemIndex = Math.round(scrollTop / ITEM_HEIGHT);
      
      // If we're in the first or last copy, jump to the middle copy
      if (itemIndex < totalItems * 0.5) {
        ref.current.scrollTop = (itemIndex + totalItems) * ITEM_HEIGHT;
      } else if (itemIndex >= totalItems * 1.5) {
        ref.current.scrollTop = (itemIndex - totalItems) * ITEM_HEIGHT;
      }
    };

    const hoursElement = hoursRef.current;
    const minutesElement = minutesRef.current;

    const hoursScrollHandler = () => {
      handleHourScroll();
      handleInfiniteScroll(hoursRef, 24);
    };

    const minutesScrollHandler = () => {
      handleMinuteScroll();
      handleInfiniteScroll(minutesRef, 60);
    };

    hoursElement?.addEventListener('scroll', hoursScrollHandler);
    minutesElement?.addEventListener('scroll', minutesScrollHandler);

    return () => {
      hoursElement?.removeEventListener('scroll', hoursScrollHandler);
      minutesElement?.removeEventListener('scroll', minutesScrollHandler);
      if (hoursScrollTimeout.current) clearTimeout(hoursScrollTimeout.current);
      if (minutesScrollTimeout.current) clearTimeout(minutesScrollTimeout.current);
    };
  }, [hours, minutes, currentDate, onChange]);

  return (
    <div className={cn("relative select-none", className)}>
      <div className="flex items-center justify-center gap-2">
        {/* Hours wheel */}
        <div className="relative h-[200px] w-16 overflow-hidden">
          <div
            ref={hoursRef}
            className="h-full overflow-y-scroll scrollbar-hide"
            style={{
              perspective: '1000px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <div style={{ height: ITEM_HEIGHT * 2 }} /> {/* Top padding */}
            {hoursList.map((hour, index) => {
              const middleIndex = hoursRef.current 
                ? Math.round(hoursRef.current.scrollTop / ITEM_HEIGHT) + 2
                : 24 + hours;
              const style = getItemTransform(index, middleIndex);
              
              return (
                <div
                  key={`hour-${index}`}
                  className="flex items-center justify-center transition-all duration-100"
                  style={{
                    height: ITEM_HEIGHT,
                    ...style,
                  }}
                >
                  <span className="text-lg">
                    {(hour % 24).toString().padStart(2, "0")}
                  </span>
                </div>
              );
            })}
            <div style={{ height: ITEM_HEIGHT * 2 }} /> {/* Bottom padding */}
          </div>
          
          {/* Selection indicator - centered highlight */}
          <div 
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 border-y-2 border-primary/20 bg-primary/5 pointer-events-none"
            style={{ borderRadius: '8px' }}
          />
          
          {/* Fade gradients */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </div>

        <span className="text-2xl font-semibold">:</span>

        {/* Minutes wheel */}
        <div className="relative h-[200px] w-16 overflow-hidden">
          <div
            ref={minutesRef}
            className="h-full overflow-y-scroll scrollbar-hide"
            style={{
              perspective: '1000px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <div style={{ height: ITEM_HEIGHT * 2 }} /> {/* Top padding */}
            {minutesList.map((minute, index) => {
              const middleIndex = minutesRef.current 
                ? Math.round(minutesRef.current.scrollTop / ITEM_HEIGHT) + 2
                : 60 + minutes;
              const style = getItemTransform(index, middleIndex);
              
              return (
                <div
                  key={`minute-${index}`}
                  className="flex items-center justify-center transition-all duration-100"
                  style={{
                    height: ITEM_HEIGHT,
                    ...style,
                  }}
                >
                  <span className="text-lg">
                    {(minute % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              );
            })}
            <div style={{ height: ITEM_HEIGHT * 2 }} /> {/* Bottom padding */}
          </div>
          
          {/* Selection indicator - centered highlight */}
          <div 
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 border-y-2 border-primary/20 bg-primary/5 pointer-events-none"
            style={{ borderRadius: '8px' }}
          />
          
          {/* Fade gradients */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}