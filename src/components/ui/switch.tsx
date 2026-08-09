import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer relative inline-flex h-tap w-switch-w shrink-0 cursor-pointer items-center rounded-full transition-all duration-200 before:absolute before:inset-x-0 before:top-1/2 before:h-switch-h before:-translate-y-1/2 before:rounded-full",
      "data-[state=checked]:before:bg-[#423a6a] data-[state=checked]:before:ring-1 data-[state=checked]:before:ring-primary",
      "data-[state=unchecked]:before:bg-secondary data-[state=unchecked]:before:ring-1 data-[state=unchecked]:before:ring-border",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none absolute left-1 top-1/2 z-10 flex h-control w-control -translate-y-1/2 items-center justify-center rounded-full transition-all duration-200",
        "data-[state=checked]:translate-x-7 data-[state=unchecked]:translate-x-0",
        "data-[state=checked]:bg-primary-hover",
        "data-[state=unchecked]:bg-[#75798c]",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
