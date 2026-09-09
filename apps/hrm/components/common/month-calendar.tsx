'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  getMonth,
  getYear,
  isSameDay,
  isSameMonth,
  startOfMonth
} from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@archmage/ui';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

export function toCalendarDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

type MonthCalendarProps<TDayData> = {
  /** Optional controlled month (0–11). Defaults to current month. */
  month?: number;
  /** Optional controlled year. Defaults to current year. */
  year?: number;
  /** When true, shows month/year selectors. Default true. */
  showFilters?: boolean;
  /** Map keyed by yyyy-MM-dd */
  days?: Record<string, TDayData>;
  /** Title prefix before "· Month Year". */
  titlePrefix?: string;
  className?: string;
  /** Content rendered under the day number inside each cell button. */
  renderDayContent?: (date: Date, data?: TDayData) => ReactNode;
  /** Drawer title for the selected day. */
  renderDrawerTitle?: (date: Date, data?: TDayData) => ReactNode;
  /** Drawer description for the selected day. */
  renderDrawerDescription?: (date: Date, data?: TDayData) => ReactNode;
  /** Drawer body for the selected day. */
  renderDrawerContent?: (date: Date, data?: TDayData) => ReactNode;
  onMonthChange?: (month: number, year: number) => void;
  onDaySelect?: (date: Date, data?: TDayData) => void;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i),
  label: format(new Date(2020, i, 1), 'MMMM')
}));

function buildYearOptions(centerYear: number) {
  const start = centerYear - 5;
  return Array.from({ length: 11 }, (_, i) => start + i);
}

/**
 * Generic monthly calendar shell (date-fns only).
 * Customize cell and drawer content via render props for leave, attendance, etc.
 */
export function MonthCalendar<TDayData = unknown>({
  month: controlledMonth,
  year: controlledYear,
  showFilters = true,
  days = {},
  titlePrefix = 'Calendar',
  className,
  renderDayContent,
  renderDrawerTitle,
  renderDrawerDescription,
  renderDrawerContent,
  onMonthChange,
  onDaySelect
}: MonthCalendarProps<TDayData>) {
  const now = new Date();
  const [internalMonth, setInternalMonth] = useState(getMonth(now));
  const [internalYear, setInternalYear] = useState(getYear(now));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const month = controlledMonth ?? internalMonth;
  const year = controlledYear ?? internalYear;
  const viewDate = useMemo(() => new Date(year, month, 1), [year, month]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    const daysInMonth = eachDayOfInterval({ start, end });
    const leadingBlanks = getDay(start); // Sunday = 0
    return { leadingBlanks, daysInMonth };
  }, [viewDate]);

  const selectedKey = selectedDate ? toCalendarDateKey(selectedDate) : null;
  const selectedDayData =
    selectedKey != null ? days[selectedKey] : undefined;

  const updateMonthYear = (nextMonth: number, nextYear: number) => {
    if (controlledMonth == null) setInternalMonth(nextMonth);
    if (controlledYear == null) setInternalYear(nextYear);
    onMonthChange?.(nextMonth, nextYear);
  };

  const handleDayClick = (date: Date) => {
    const data = days[toCalendarDateKey(date)];
    setSelectedDate(date);
    setDrawerOpen(true);
    onDaySelect?.(date, data);
  };

  const yearOptions = buildYearOptions(getYear(now));

  return (
    <>
      <Card
        className={cn(
          'rounded-lg border border-border shadow-sm h-full',
          className
        )}
      >
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold">
            {titlePrefix} · {format(viewDate, 'MMMM yyyy')}
          </CardTitle>
          {showFilters ? (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(month)}
                onValueChange={(value) =>
                  updateMonthYear(Number(value), year)
                }
              >
                <SelectTrigger className="h-9 w-34">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(year)}
                onValueChange={(value) =>
                  updateMonthYear(month, Number(value))
                }
              >
                <SelectTrigger className="h-9 w-24">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((optionYear) => (
                    <SelectItem key={optionYear} value={String(optionYear)}>
                      {optionYear}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-2">
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((label, index) => (
              <div
                key={`${label}-${index}`}
                className="px-1 text-center text-xs font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: calendarDays.leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} className="min-h-14 rounded-md" />
            ))}

            {calendarDays.daysInMonth.map((date) => {
              const key = toCalendarDateKey(date);
              const data = days[key];
              const isSelected =
                selectedDate != null && isSameDay(date, selectedDate);
              const inMonth = isSameMonth(date, viewDate);

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!inMonth}
                  onClick={() => handleDayClick(date)}
                  className={cn(
                    'min-h-14 rounded-md border border-border bg-background p-1.5 text-left transition-colors',
                    'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected && 'ring-2 ring-primary/40'
                  )}
                >
                  <span className="text-xs font-medium text-foreground">
                    {format(date, 'd')}
                  </span>
                  {renderDayContent?.(date, data)}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {selectedDate
                ? (renderDrawerTitle?.(selectedDate, selectedDayData) ??
                  format(selectedDate, 'EEEE, d MMMM yyyy'))
                : 'Details'}
            </DrawerTitle>
            {selectedDate ? (
              <DrawerDescription>
                {renderDrawerDescription?.(selectedDate, selectedDayData) ??
                  null}
              </DrawerDescription>
            ) : null}
          </DrawerHeader>

          <div className="max-h-[50vh] space-y-2 overflow-y-auto px-4 pb-6">
            {selectedDate
              ? (renderDrawerContent?.(selectedDate, selectedDayData) ?? (
                  <p className="text-sm text-muted-foreground">
                    No details available.
                  </p>
                ))
              : null}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
