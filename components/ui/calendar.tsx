"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfYear, addMonths } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export interface CalendarProps {
  selected?: Date;
  currentYear: number;
  onSelect: (date: Date, year: number) => void;
  onYearChange: (year: number) => void;
}

function Calendar({ selected, currentYear, onSelect, onYearChange }: CalendarProps) {

  const months = Array.from({ length: 12 }, (_, i) =>
    addMonths(startOfYear(new Date(currentYear, 0, 1)), i)
  );

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-4">
        <button
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
          onClick={() => onYearChange(currentYear - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{currentYear}</span>
        <button
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
          onClick={() => onYearChange(currentYear + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {months.map((month) => (
          <button
            key={month.toString()}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "text-sm p-2 rounded-md",
              selected &&
                format(selected, "yyyy-MM") === format(month, "yyyy-MM") &&
                "bg-primary text-primary-foreground"
            )}
            onClick={() => onSelect(month, currentYear)}
          >
            {format(month, "MMM")}
          </button>
        ))}
      </div>
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };

