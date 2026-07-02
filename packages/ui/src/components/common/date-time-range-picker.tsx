'use client';

import * as React from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { CalendarIcon } from 'lucide-react';

/** Values in local datetime format: YYYY-MM-DDTHH:mm (same as input[type=datetime-local]) */
export interface DateTimeRangePickerProps {
  from?: string;
  to?: string;
  onChange: (range: { from?: string; to?: string }) => void;
  /** Optional: label for the group */
  label?: string;
  className?: string;
  /** Keep from/to inputs on a single row. */
  singleRow?: boolean;
}

/**
 * Picker for "from" and "to" date-time. Uses native datetime-local inputs.
 * from/to are in format YYYY-MM-DDTHH:mm (local time).
 */
export function DateTimeRangePicker({
  from,
  to,
  onChange,
  label = 'Date & time range',
  className,
  singleRow = false,
}: DateTimeRangePickerProps) {
  const fromRef = React.useRef<HTMLInputElement>(null);
  const toRef = React.useRef<HTMLInputElement>(null);

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || undefined;
    onChange({ from: value, to });
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || undefined;
    onChange({ from, to: value });
  };

  const openFromPicker = () => {
    fromRef.current?.focus();
    fromRef.current?.showPicker?.();
  };
  const openToPicker = () => {
    toRef.current?.focus();
    toRef.current?.showPicker?.();
  };

  return (
    <div className={className}>
      {label && (
        <Label className="text-sm font-semibold mb-2 block flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          {label}
        </Label>
      )}
      <div className={singleRow ? 'flex flex-nowrap items-center gap-2' : 'flex flex-col sm:flex-row flex-wrap items-center gap-2'}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap w-8">From</span>
          <div
            role="button"
            tabIndex={0}
            onClick={openFromPicker}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openFromPicker();
              }
            }}
            className="cursor-pointer rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
          >
            <Input
              id="dt-from"
              ref={fromRef}
              type="datetime-local"
              value={from ?? ''}
              onChange={handleFromChange}
              className="w-[160px] sm:w-[175px] h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent cursor-pointer"
              step="60"
              aria-label="From date and time"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap w-8">To</span>
          <div
            role="button"
            tabIndex={0}
            onClick={openToPicker}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openToPicker();
              }
            }}
            className="cursor-pointer rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
          >
            <Input
              id="dt-to"
              ref={toRef}
              type="datetime-local"
              value={to ?? ''}
              onChange={handleToChange}
              min={from ?? undefined}
              className="w-[160px] sm:w-[175px] h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent cursor-pointer"
              step="60"
              aria-label="To date and time"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
