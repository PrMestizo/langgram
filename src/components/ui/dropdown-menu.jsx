"use client";

import React, { useMemo, useState } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DropdownMenu = ({ options, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  const hasOptions = Array.isArray(options) && options.length > 0;

  const panelClassName = useMemo(
    () =>
      cn(
        "absolute z-10 w-52 mt-2 p-1 bg-black/60 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.2)] backdrop-blur-sm flex flex-col gap-2 transition-all duration-300 origin-top",
        isOpen
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 -translate-y-1 scale-95 pointer-events-none"
      ),
    [isOpen]
  );

  const caretClassName = useMemo(
    () =>
      cn(
        "ml-2 transition-transform duration-300 ease-in-out",
        isOpen ? "rotate-180" : "rotate-0"
      ),
    [isOpen]
  );

  return (
    <div className="relative inline-block text-white">
      <Button
        type="button"
        onClick={toggleDropdown}
        className="px-4 py-2 bg-[#11111198] hover:bg-[#111111d1] shadow-[0_0_20px_rgba(0,0,0,0.2)] border-none rounded-xl backdrop-blur-sm"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="flex items-center">
          {children ?? "Menu"}
          <KeyboardArrowDownIcon fontSize="small" className={caretClassName} />
        </span>
      </Button>

      <div className={panelClassName} role="menu">
        {hasOptions ? (
          options.map((option) => (
            <button
              type="button"
              key={option.label}
              onClick={option.onClick}
              className="px-3 py-3 cursor-pointer text-white text-sm rounded-lg w-full text-left flex items-center gap-x-2 hover:bg-white/10 active:scale-[0.98] transition"
              role="menuitem"
            >
              {option.Icon}
              <span>{option.label}</span>
            </button>
          ))
        ) : (
          <div className="px-4 py-2 text-white text-xs">No options</div>
        )}
      </div>
    </div>
  );
};

export { DropdownMenu };
