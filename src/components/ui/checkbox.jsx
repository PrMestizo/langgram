"use client";

import React from "react";
import { FiCheck } from "react-icons/fi";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef(function Checkbox(
  { className, checked, onChange, defaultChecked, ...props },
  ref
) {
  const isControlled = typeof checked !== "undefined";

  return (
    <label
      className={cn(
        "inline-flex items-center justify-center h-4 w-4 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        className="sr-only"
        checked={isControlled ? checked : undefined}
        onChange={onChange}
        defaultChecked={!isControlled ? defaultChecked : undefined}
        {...props}
      />
      <span
        className={cn(
          "flex items-center justify-center text-primary-foreground transition-opacity",
          (isControlled ? checked : defaultChecked) ? "opacity-100" : "opacity-0"
        )}
      >
        <FiCheck className="h-4 w-4" />
      </span>
    </label>
  );
});

export { Checkbox };
