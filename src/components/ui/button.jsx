import React from "react";
import { cn } from "@/lib/utils";

const baseButtonClasses =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/50 disabled:pointer-events-none disabled:opacity-50";

const Button = React.forwardRef(({ className = "", children, ...props }, ref) => {
  return (
    <button ref={ref} className={cn(baseButtonClasses, className)} {...props}>
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button };
