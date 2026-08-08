import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-3 py-2 text-micro font-medium uppercase tracking-[0.06em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        kept: "bg-[#423a6a] text-[#e7e5fe]",
        break: "border border-[#9397ab] text-[#cfd3e5]",
        over: "bg-[#3a2c1a] text-[#e5bd85]",
        had: "bg-secondary text-muted-foreground",
        now: "bg-primary text-background",
      },
    },
    defaultVariants: {
      variant: "had",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
