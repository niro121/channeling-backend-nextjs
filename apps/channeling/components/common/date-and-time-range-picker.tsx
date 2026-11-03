'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/common/date-range-picker';
import { TimePickerSelect } from '@/components/common/time-picker-select';
import { timeToMinutes, minutesToTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

/** Parse from/to: YYYY-MM-DD or YYYY-MM-DDTHH:mm -> { date, timeStr, meridiem } */
function parseDateTime(val?: string): {
  date: string;
  timeStr: string;
  meridiem: 'AM' | 'PM';
} {
  if (!val) return { date: '', timeStr: '', meridiem: 'AM' };
  const tIdx = val.indexOf('T');
  const date = tIdx >= 0 ? val.slice(0, tIdx) : val;
  if (tIdx < 0 || !val.slice(tIdx + 1)) {
    return { date, timeStr: '', meridiem: 'AM' };
  }
  const time24 = val.slice(tIdx + 1);
  const [h, m] = time24.split(':').map(Number);
  const mins = (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  const { timeStr, meridiem } = minutesToTime(Math.min(1439, Math.max(0, mins)));
  return { date, timeStr, meridiem };
}

/** Build 24hr time string from timeStr + meridiem for API */
function to24Hour(timeStr: string, meridiem: 'AM' | 'PM'): string {
  const mins = timeToMinutes(timeStr, meridiem);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Add one hour to minutes-from-midnight, clamped to 1439 */
function addOneHour(minutes: number): number {
  return Math.min(1439, minutes + 60);
}

// ---------------------------------------------------------------------------
// Wrapper around TimePickerSelect that coalesces onTimeChange + onMeridiemChange
// into a single callback, avoiding race conditions when both fire in succession.
// ---------------------------------------------------------------------------
interface TimePickerSelectCoalescedProps {
  id: string;
  label: string;
  timeValue: string;
  meridiemValue: 'AM' | 'PM';
  onChanged: (timeStr: string, meridiem: 'AM' | 'PM') => void;
  disabled?: boolean;
  styleClasses?: {
    labelClassName?: string;
    parentDiv?: string;
  };
}

function TimePickerSelectCoalesced({
  id,
  label,
  timeValue,
  meridiemValue,
  onChanged,
  disabled,
  styleClasses
}: TimePickerSelectCoalescedProps) {
  const pendingTimeRef = useRef<string | null>(null);

  const handleTimeChange = (e: { target: { value: string } }) => {
    pendingTimeRef.current = e.target.value || '';
    // Don't call onChanged here - TimePickerSelect always fires onMeridiemChange next
    // with the same (time, meridiem) pair. Let handleMeridiemChange do the single update.
  };

  const handleMeridiemChange = (m: 'AM' | 'PM') => {
    const t = (pendingTimeRef.current ?? timeValue) || '12:00';
    pendingTimeRef.current = null;
    onChanged(t, m);
  };

  return (
    <TimePickerSelect
      id={id}
      label={label}
      timeValue={timeValue}
      meridiemValue={meridiemValue}
      onTimeChange={handleTimeChange}
      onMeridiemChange={handleMeridiemChange}
      disabled={disabled}
      hideErrorMessage
      styleClasses={{
        labelClassName: styleClasses?.labelClassName ?? '',
        parentDiv: styleClasses?.parentDiv ?? 'space-y-0'
      }}
    />
  );
}

export interface DateAndTimeRangePickerProps {
  from?: string;
  to?: string;
  onChange: (range: { from?: string; to?: string }) => void;
  label?: string;
  className?: string;
}

/**
 * Date range picker + optional time pickers.
 * Time pickers are disabled until the corresponding date is selected.
 * When "from time" changes, "to time" auto-updates to from+1hr until user manually sets "to time".
 */
export function DateAndTimeRangePicker({
  from,
  to,
  onChange,
  label = 'Date & Time Range',
  className
}: DateAndTimeRangePickerProps) {
  const fromParts = parseDateTime(from);
  const toParts = parseDateTime(to);

  /** Tracks whether user has manually selected "to time". When false, we auto-set to = from + 1hr. */
  const [userHasSetToTime, setUserHasSetToTime] = useState(false);

  // Reset when date range is cleared so we start fresh on new selection
  useEffect(() => {
    if (!fromParts.date || !toParts.date) {
      setUserHasSetToTime(false);
    }
  }, [fromParts.date, toParts.date]);

  const handleDateChange = (range: { from?: string; to?: string }) => {
    const fromDate = range.from ?? '';
    const toDate = range.to ?? '';
    onChange({
      from: fromDate
        ? fromParts.timeStr && fromParts.meridiem
          ? `${fromDate}T${to24Hour(fromParts.timeStr, fromParts.meridiem)}`
          : fromDate
        : undefined,
      to: toDate
        ? toParts.timeStr && toParts.meridiem
          ? `${toDate}T${to24Hour(toParts.timeStr, toParts.meridiem)}`
          : toDate
        : undefined
    });
  };

  const handleFromTimeChanged = (timeStr: string, meridiem: 'AM' | 'PM') => {
    if (!fromParts.date) return;
    const from24 = timeStr && meridiem ? to24Hour(timeStr, meridiem) : null;
    const newFrom = from24 ? `${fromParts.date}T${from24}` : fromParts.date;

    // Auto-update "to" to from + 1hr if user hasn't manually set it
    let newTo: string | undefined = to;
    if (toParts.date && !userHasSetToTime && timeStr && meridiem) {
      const fromMins = timeToMinutes(timeStr, meridiem);
      const toMins = addOneHour(fromMins);
      const { timeStr: toStr, meridiem: toMer } = minutesToTime(toMins);
      newTo = `${toParts.date}T${to24Hour(toStr, toMer)}`;
    }

    onChange({ from: newFrom, to: newTo });
  };

  const handleToTimeChanged = (timeStr: string, meridiem: 'AM' | 'PM') => {
    setUserHasSetToTime(true);
    if (!toParts.date) return;
    const to24 = timeStr && meridiem ? to24Hour(timeStr, meridiem) : null;
    const newTo = to24 ? `${toParts.date}T${to24}` : toParts.date;
    onChange({ from, to: newTo });
  };

  const hasFromDate = Boolean(fromParts.date);
  const hasToDate = Boolean(toParts.date);

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <Label className="text-sm font-semibold flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          {label}
        </Label>
      )}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="shrink-0 min-w-[200px]">
            <span className="text-xs text-muted-foreground font-medium block mb-1.5">
              Date range
            </span>
            <DateRangePicker
              // key={`dr-${fromParts.date ?? ''}-${toParts.date ?? ''}`}
              from={fromParts.date || undefined}
              to={toParts.date || undefined}
              onChange={handleDateChange}
            />
          </div>

          <div
            className={cn(
              'flex flex-wrap items-end gap-3 transition-opacity duration-200',
              !hasFromDate && !hasToDate && 'opacity-50 pointer-events-none'
            )}
          >
            <div className="w-[140px]">
              <TimePickerSelectCoalesced
                id="fromTime"
                label="From time"
                timeValue={fromParts.timeStr}
                meridiemValue={fromParts.meridiem}
                onChanged={handleFromTimeChanged}
                disabled={!hasFromDate}
                styleClasses={{
                  labelClassName:
                    'text-xs text-muted-foreground font-medium mb-1.5 block',
                  parentDiv: 'space-y-0'
                }}
              />
            </div>
            <div className="w-[140px]">
              <TimePickerSelectCoalesced
                id="toTime"
                label="To time"
                timeValue={toParts.timeStr}
                meridiemValue={toParts.meridiem}
                onChanged={handleToTimeChanged}
                disabled={!hasToDate}
                styleClasses={{
                  labelClassName:
                    'text-xs text-muted-foreground font-medium mb-1.5 block',
                  parentDiv: 'space-y-0'
                }}
              />
            </div>
          </div>
        </div>
        {(!hasFromDate || !hasToDate) && (
          <p className="text-xs text-muted-foreground">
            Select a date range first to optionally set specific times.
          </p>
        )}
      </div>
    </div>
  );
}
