"use client"
'use client';

import * as React from 'react';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '../ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { type DateRange } from 'react-day-picker';

/** Calendar day as YYYY-MM-DD in the user's local timezone (avoids UTC shift from toISOString). */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD as a local calendar date (not UTC midnight). */
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return new Date(s);
  return new Date(y, m - 1, d);
}

interface DateRangePickerProps {
  from?: string;
  to?: string;
  onChange: (range: { from?: string; to?: string }) => void;
}

export function DateRangePicker({
  from,
  to,
  onChange
}: DateRangePickerProps) {
  const selectedRange: DateRange | undefined =
    from || to
      ? {
          from: from ? parseLocalDate(from) : undefined,
          to: to ? parseLocalDate(to) : undefined
        }
      : undefined;

  const handleSelect = (range?: DateRange) => {
    onChange({
      from: range?.from ? toLocalDateString(range.from) : undefined,
      to: range?.to ? toLocalDateString(range.to) : undefined
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start px-2.5 font-normal">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedRange?.from ? (
            selectedRange.to ? (
              <>
                {format(selectedRange.from, 'LLL dd, y')} –{' '}
                {format(selectedRange.to, 'LLL dd, y')}
              </>
            ) : (
              format(selectedRange.from, 'LLL dd, y')
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={handleSelect}
          numberOfMonths={2}
          captionLayout="dropdown"
          hideNavigation
          startMonth={new Date(1970, 0)}
          endMonth={new Date(new Date().getFullYear() + 20, 11)}
          fromMonth={new Date(1970, 0)}
          toMonth={new Date(new Date().getFullYear() + 20, 11)}
        />
      </PopoverContent>
    </Popover>
  );
}
