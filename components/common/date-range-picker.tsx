'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { type DateRange } from 'react-day-picker';

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
          from: from ? new Date(from) : undefined,
          to: to ? new Date(to) : undefined
        }
      : undefined;

  const handleSelect = (range?: DateRange) => {
    onChange({
      from: range?.from ? range.from.toISOString().split('T')[0] : undefined,
      to: range?.to ? range.to.toISOString().split('T')[0] : undefined
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
