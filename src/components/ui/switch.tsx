import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full transition-all duration-200",
      "border-[3px]",
      "data-[state=checked]:bg-primary data-[state=checked]:border-primary",
      "data-[state=unchecked]:bg-muted/50 data-[state=unchecked]:border-muted-foreground/50",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none flex items-center justify-center rounded-full shadow-lg ring-0 transition-all duration-200",
        "h-6 w-6",
        "data-[state=checked]:translate-x-8 data-[state=unchecked]:translate-x-0.5",
        "data-[state=checked]:bg-white",
        "data-[state=unchecked]:bg-foreground/80",
        "border-2 data-[state=checked]:border-white data-[state=unchecked]:border-muted-foreground/30",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
