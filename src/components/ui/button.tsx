import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-primary text-primary-hover active:border-[#b5abfc] active:bg-[rgba(145,132,217,.14)] active:text-[#d2cefd] disabled:border-secondary disabled:text-[#5f6377]",
        destructive: "border border-warning text-warning disabled:opacity-50",
        outline: "border border-border text-foreground disabled:opacity-50",
        secondary: "border border-border text-foreground disabled:opacity-50",
        ghost: "text-muted-foreground disabled:opacity-50",
        link: "text-primary underline-offset-4 hover:underline disabled:opacity-50",
      },
      size: {
        act: "h-act rounded-lg px-6 text-lead font-medium",
        tap: "h-tap rounded-lg px-6 text-body font-normal",
        sm: "h-tap rounded-lg px-6 text-body font-normal",
        lg: "h-tap rounded-lg px-6 text-body font-normal",
        icon: "h-tap w-tap rounded-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "tap",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
