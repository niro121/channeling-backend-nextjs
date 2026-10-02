'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { ErrorMessage } from 'formik';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

function parseTimeValue(timeValue: string): { hour: number; minute: number } {
  if (!timeValue) return { hour: 12, minute: 0 };
  const normalized = timeValue.includes(':')
    ? timeValue
    : `${timeValue.padStart(2, '0')}:00`;
  const [h, m] = normalized.split(':').map(Number);
  const hour12 = Math.min(12, Math.max(1, isNaN(h) ? 12 : h % 12 || 12));
  const minute = Math.min(59, Math.max(0, isNaN(m) ? 0 : m));
  return { hour: hour12, minute };
}

function formatTime(hour: number, minute: number, meridiem: 'AM' | 'PM'): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${meridiem}`;
}

function timeToString(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

interface SpinnerSegmentProps {
  value: string;
  onIncrement: () => void;
  onDecrement: () => void;
  className?: string;
}

function SpinnerSegment({ value, onIncrement, onDecrement, className }: SpinnerSegmentProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center border border-input rounded-md bg-background overflow-hidden',
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-full rounded-none shrink-0 hover:bg-muted text-foreground hover:text-foreground"
        onClick={(e) => {
          e.preventDefault();
          onIncrement();
        }}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>
      <div className="flex items-center justify-center min-h-[28px] px-2 text-sm font-medium tabular-nums">
        {value}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-full rounded-none shrink-0 hover:bg-muted text-foreground hover:text-foreground"
        onClick={(e) => {
          e.preventDefault();
          onDecrement();
        }}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface TimePickerSelectProps {
  id: string;
  label: string;
  timeValue: string;
  meridiemValue: 'AM' | 'PM';
  onTimeChange: (e: { target: { id: string; value: string } }) => void;
  onMeridiemChange: (value: 'AM' | 'PM') => void;
  required?: boolean;
  disabled?: boolean;
  /** Set to true when used outside Formik to avoid ErrorMessage reading undefined context */
  hideErrorMessage?: boolean;
  styleClasses?: {
    parentDiv?: string;
    labelClassName?: string;
    inputClassName?: string;
  };
}

export function TimePickerSelect({
  id,
  label,
  timeValue,
  meridiemValue,
  onTimeChange,
  onMeridiemChange,
  required = false,
  disabled = false,
  hideErrorMessage = false,
  styleClasses
}: TimePickerSelectProps) {
  const parsed = useMemo(
    () => parseTimeValue(timeValue),
    [timeValue]
  );

  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>(meridiemValue);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setHour(parsed.hour);
    setMinute(parsed.minute);
    setMeridiem(meridiemValue);
  }, [timeValue, meridiemValue, open]);

  const notifyChange = (h: number, m: number, mer: 'AM' | 'PM') => {
    const timeStr = timeToString(h, m);
    onTimeChange({ target: { id, value: timeStr } });
    onMeridiemChange(mer);
  };

  const incHour = () => {
    const next = hour >= 12 ? 1 : hour + 1;
    setHour(next);
    notifyChange(next, minute, meridiem);
  };
  const decHour = () => {
    const next = hour <= 1 ? 12 : hour - 1;
    setHour(next);
    notifyChange(next, minute, meridiem);
  };
  const incMinute = () => {
    const next = minute >= 59 ? 0 : minute + 1;
    setMinute(next);
    notifyChange(hour, next, meridiem);
  };
  const decMinute = () => {
    const next = minute <= 0 ? 59 : minute - 1;
    setMinute(next);
    notifyChange(hour, next, meridiem);
  };
  const toggleMeridiem = () => {
    const next = meridiem === 'AM' ? 'PM' : 'AM';
    setMeridiem(next);
    notifyChange(hour, minute, next);
  };

  const displayText = formatTime(hour, minute, meridiem);

  return (
    <div className={styleClasses?.parentDiv}>
      <Label className={styleClasses?.labelClassName}>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </Label>
      <div className={styleClasses?.inputClassName}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={cn(
                'flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-left',
                'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                open && 'border-green-700 ring-2 ring-green-700/20'
              )}
            >
              <span className="tabular-nums">
                {timeValue && meridiemValue ? displayText : `Select ${label.toLowerCase()}`}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-3" sideOffset={6}>
            <div className="flex items-center gap-1">
              <SpinnerSegment
                value={hour.toString().padStart(2, '0')}
                onIncrement={incHour}
                onDecrement={decHour}
                className="w-12"
              />
              <span className="text-lg font-medium text-muted-foreground px-0.5">:</span>
              <SpinnerSegment
                value={minute.toString().padStart(2, '0')}
                onIncrement={incMinute}
                onDecrement={decMinute}
                className="w-12"
              />
              <SpinnerSegment
                value={meridiem}
                onIncrement={toggleMeridiem}
                onDecrement={toggleMeridiem}
                className="w-11"
              />
            </div>
          </PopoverContent>
        </Popover>
        {!hideErrorMessage && (
          <ErrorMessage
            name={id}
            component="div"
            className="text-red-600 text-sm pt-1"
          />
        )}
      </div>
    </div>
  );
}
