'use client';

import { useMemo, useState, useTransition } from 'react';
import { format, getMonth, getYear } from 'date-fns';
import { Badge } from '@archmage/ui';
import {
  MonthCalendar,
  toCalendarDateKey
} from '@/components/common/month-calendar';
import { getLeaveCalendarDaysAction } from '@/app/actions/leave-actions/leave-management.actions';

export type LeaveCalendarDayEntry = {
  id: string;
  name: string;
  department?: string;
  leaveType: string;
  status: 'pending' | 'approved';
  dateRange?: string;
  duration?: string;
};

export type LeaveCalendarDayData = {
  count: number;
  pendingCount?: number;
  approvedCount?: number;
  entries?: LeaveCalendarDayEntry[];
};

type SectionLeaveCalendarProps = {
  month?: number;
  year?: number;
  showFilters?: boolean;
  /** Initial server-loaded days for the default month. */
  initialDays?: Record<string, LeaveCalendarDayData>;
  titlePrefix?: string;
  className?: string;
};

export default function SectionLeaveCalendar({
  month: controlledMonth,
  year: controlledYear,
  showFilters = true,
  initialDays = {},
  titlePrefix = 'Leave Calendar',
  className
}: SectionLeaveCalendarProps) {
  const now = new Date();
  const [internalMonth, setInternalMonth] = useState(getMonth(now));
  const [internalYear, setInternalYear] = useState(getYear(now));
  const [daysByMonth, setDaysByMonth] = useState<
    Record<string, Record<string, LeaveCalendarDayData>>
  >(() => {
    const key = `${getYear(now)}-${getMonth(now)}`;
    return { [key]: initialDays };
  });
  const [isPending, startTransition] = useTransition();

  const month = controlledMonth ?? internalMonth;
  const year = controlledYear ?? internalYear;
  const cacheKey = `${year}-${month}`;

  const dayData = useMemo(
    () => daysByMonth[cacheKey] ?? {},
    [daysByMonth, cacheKey]
  );

  const loadMonth = (nextMonth: number, nextYear: number) => {
    const key = `${nextYear}-${nextMonth}`;
    if (daysByMonth[key]) return;

    startTransition(async () => {
      const result = await getLeaveCalendarDaysAction({
        month: nextMonth,
        year: nextYear
      });
      setDaysByMonth((prev) => ({
        ...prev,
        [key]: result.isError ? {} : (result.data ?? {})
      }));
    });
  };

  return (
    <div className={isPending ? 'opacity-80' : undefined}>
      <MonthCalendar<LeaveCalendarDayData>
        month={month}
        year={year}
        showFilters={showFilters}
        days={dayData}
        titlePrefix={titlePrefix}
        className={className}
        onMonthChange={(nextMonth, nextYear) => {
          if (controlledMonth == null) setInternalMonth(nextMonth);
          if (controlledYear == null) setInternalYear(nextYear);
          loadMonth(nextMonth, nextYear);
        }}
        renderDayContent={(_date, data) => {
          if (!data || data.count <= 0) return null;
          const pending = data.pendingCount ?? 0;
          const approved = data.approvedCount ?? 0;
          return (
            <div className="mt-1 flex flex-wrap gap-1">
              {approved > 0 ? (
                <Badge className="block w-fit border-0 bg-emerald-50 px-1.5 py-0 text-[10px] font-medium text-teal-800 hover:bg-emerald-50">
                  {approved} approved
                </Badge>
              ) : null}
              {pending > 0 ? (
                <Badge className="block w-fit border-0 bg-amber-50 px-1.5 py-0 text-[10px] font-medium text-amber-800 hover:bg-amber-50">
                  {pending} pending
                </Badge>
              ) : null}
            </div>
          );
        }}
        renderDrawerTitle={(date) => format(date, 'EEEE, d MMMM yyyy')}
        renderDrawerDescription={(_date, data) => {
          if (!data?.count) return 'No leave recorded for this day';
          const pending = data.pendingCount ?? 0;
          const approved = data.approvedCount ?? 0;
          const parts: string[] = [];
          if (approved > 0) parts.push(`${approved} approved`);
          if (pending > 0) parts.push(`${pending} pending`);
          return parts.length
            ? `${parts.join(' · ')} on this day`
            : `${data.count} leave on this day`;
        }}
        renderDrawerContent={(_date, data) =>
          data?.entries?.length ? (
            <div className="space-y-2">
              {data.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-semibold">{entry.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.leaveType}
                      {entry.dateRange ? ` · ${entry.dateRange}` : ''}
                      {entry.duration ? ` · ${entry.duration}` : ''}
                    </p>
                    {entry.department ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {entry.department}
                      </p>
                    ) : null}
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      entry.status === 'approved'
                        ? 'shrink-0 border-0 bg-emerald-50 text-teal-800'
                        : 'shrink-0 border-0 bg-amber-50 text-amber-800'
                    }
                  >
                    {entry.status === 'approved' ? 'Approved' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No leave details available.
            </p>
          )
        }
      />
    </div>
  );
}

export { toCalendarDateKey };
