'use client';

import { useMemo, useState } from 'react';
import { format, getMonth, getYear } from 'date-fns';
import { Badge } from '@archmage/ui';
import {
  MonthCalendar,
  toCalendarDateKey
} from '@/components/common/month-calendar';

export type LeaveCalendarDayEntry = {
  id: string;
  name: string;
  department?: string;
  leaveType: string;
};

export type LeaveCalendarDayData = {
  /** Count shown as "N off" on the cell */
  count: number;
  entries?: LeaveCalendarDayEntry[];
};

type SectionLeaveCalendarProps = {
  month?: number;
  year?: number;
  showFilters?: boolean;
  days?: Record<string, LeaveCalendarDayData>;
  titlePrefix?: string;
  className?: string;
  onMonthChange?: (month: number, year: number) => void;
  onDaySelect?: (date: Date, data?: LeaveCalendarDayData) => void;
};

/** Sample leave counts for demo when no `days` prop is provided. */
function buildSampleDays(viewDate: Date): Record<string, LeaveCalendarDayData> {
  const year = getYear(viewDate);
  const month = getMonth(viewDate);
  const samples: Array<{
    day: number;
    count: number;
    entries: LeaveCalendarDayEntry[];
  }> = [
    {
      day: 1,
      count: 1,
      entries: [
        { id: '1', name: 'N. Fernando', department: 'Ward 3', leaveType: 'Casual' }
      ]
    },
    {
      day: 2,
      count: 2,
      entries: [
        { id: '2', name: 'S. Perera', department: 'ICU', leaveType: 'Medical' },
        { id: '3', name: 'K. Jayasuriya', department: 'OPD', leaveType: 'Annual' }
      ]
    },
    {
      day: 4,
      count: 1,
      entries: [
        { id: '4', name: 'R. Silva', department: 'Lab', leaveType: 'Half-day' }
      ]
    },
    {
      day: 5,
      count: 3,
      entries: [
        { id: '5', name: 'A. Bandara', department: 'Nursing', leaveType: 'Annual' },
        { id: '6', name: 'M. Farook', department: 'Pharmacy', leaveType: 'Casual' },
        {
          id: '7',
          name: 'D. Wickramasinghe',
          department: 'Admin',
          leaveType: 'Medical'
        }
      ]
    },
    {
      day: 8,
      count: 1,
      entries: [
        { id: '8', name: 'P. Gunasekara', department: 'OT', leaveType: 'Annual' }
      ]
    },
    {
      day: 9,
      count: 2,
      entries: [
        { id: '9', name: 'L. Mendis', department: 'Ward 1', leaveType: 'Casual' },
        {
          id: '10',
          name: 'H. Pathirana',
          department: 'Ward 2',
          leaveType: 'Annual'
        }
      ]
    },
    {
      day: 11,
      count: 1,
      entries: [
        {
          id: '11',
          name: 'T. Cooray',
          department: 'Radiology',
          leaveType: 'Medical'
        }
      ]
    },
    {
      day: 12,
      count: 4,
      entries: [
        { id: '12', name: 'N. Fernando', department: 'Ward 3', leaveType: 'Annual' },
        { id: '13', name: 'S. Perera', department: 'ICU', leaveType: 'Casual' },
        {
          id: '14',
          name: 'K. Jayasuriya',
          department: 'OPD',
          leaveType: 'Annual'
        },
        { id: '15', name: 'R. Silva', department: 'Lab', leaveType: 'Medical' }
      ]
    },
    {
      day: 15,
      count: 1,
      entries: [
        { id: '16', name: 'A. Bandara', department: 'Nursing', leaveType: 'Casual' }
      ]
    },
    {
      day: 16,
      count: 2,
      entries: [
        {
          id: '17',
          name: 'M. Farook',
          department: 'Pharmacy',
          leaveType: 'Annual'
        },
        {
          id: '18',
          name: 'D. Wickramasinghe',
          department: 'Admin',
          leaveType: 'Casual'
        }
      ]
    },
    {
      day: 18,
      count: 1,
      entries: [
        {
          id: '19',
          name: 'P. Gunasekara',
          department: 'OT',
          leaveType: 'Half-day'
        }
      ]
    },
    {
      day: 19,
      count: 2,
      entries: [
        { id: '20', name: 'L. Mendis', department: 'Ward 1', leaveType: 'Medical' },
        {
          id: '21',
          name: 'H. Pathirana',
          department: 'Ward 2',
          leaveType: 'Annual'
        }
      ]
    },
    {
      day: 22,
      count: 1,
      entries: [
        {
          id: '22',
          name: 'T. Cooray',
          department: 'Radiology',
          leaveType: 'Casual'
        }
      ]
    },
    {
      day: 23,
      count: 3,
      entries: [
        { id: '23', name: 'N. Fernando', department: 'Ward 3', leaveType: 'Annual' },
        { id: '24', name: 'S. Perera', department: 'ICU', leaveType: 'Annual' },
        {
          id: '25',
          name: 'K. Jayasuriya',
          department: 'OPD',
          leaveType: 'Medical'
        }
      ]
    },
    {
      day: 25,
      count: 1,
      entries: [
        { id: '26', name: 'R. Silva', department: 'Lab', leaveType: 'Casual' }
      ]
    },
    {
      day: 26,
      count: 2,
      entries: [
        { id: '27', name: 'A. Bandara', department: 'Nursing', leaveType: 'Annual' },
        {
          id: '28',
          name: 'M. Farook',
          department: 'Pharmacy',
          leaveType: 'Medical'
        }
      ]
    },
    {
      day: 29,
      count: 1,
      entries: [
        {
          id: '29',
          name: 'D. Wickramasinghe',
          department: 'Admin',
          leaveType: 'Annual'
        }
      ]
    },
    {
      day: 30,
      count: 2,
      entries: [
        { id: '30', name: 'P. Gunasekara', department: 'OT', leaveType: 'Casual' },
        { id: '31', name: 'L. Mendis', department: 'Ward 1', leaveType: 'Annual' }
      ]
    }
  ];

  const map: Record<string, LeaveCalendarDayData> = {};
  for (const sample of samples) {
    const date = new Date(year, month, sample.day);
    if (getMonth(date) !== month) continue;
    map[toCalendarDateKey(date)] = {
      count: sample.count,
      entries: sample.entries
    };
  }
  return map;
}

/**
 * Leave-specific calendar built on generic MonthCalendar.
 * Only cell badge + drawer body are leave-aware.
 */
export default function SectionLeaveCalendar({
  month: controlledMonth,
  year: controlledYear,
  showFilters = true,
  days,
  titlePrefix = 'Leave Calendar',
  className,
  onMonthChange,
  onDaySelect
}: SectionLeaveCalendarProps) {
  const now = new Date();
  const [internalMonth, setInternalMonth] = useState(getMonth(now));
  const [internalYear, setInternalYear] = useState(getYear(now));

  const month = controlledMonth ?? internalMonth;
  const year = controlledYear ?? internalYear;

  const dayData = useMemo(
    () => days ?? buildSampleDays(new Date(year, month, 1)),
    [days, month, year]
  );

  return (
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
        onMonthChange?.(nextMonth, nextYear);
      }}
      onDaySelect={onDaySelect}
      renderDayContent={(_date, data) =>
        data && data.count > 0 ? (
          <Badge className="mt-1 block w-fit border-0 bg-emerald-50 px-1.5 py-0 text-[10px] font-medium text-teal-800 hover:bg-emerald-50">
            {data.count} off
          </Badge>
        ) : null
      }
      renderDrawerTitle={(date) => format(date, 'EEEE, d MMMM yyyy')}
      renderDrawerDescription={(_date, data) =>
        data?.count
          ? `${data.count} staff off on this day`
          : 'No leave recorded for this day'
      }
      renderDrawerContent={(_date, data) =>
        data?.entries?.length ? (
          data.entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{entry.name}</p>
                {entry.department ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.department}
                  </p>
                ) : null}
              </div>
              <Badge
                variant="secondary"
                className="shrink-0 border-0 bg-slate-200/80 text-slate-700"
              >
                {entry.leaveType}
              </Badge>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No leave details available.
          </p>
        )
      }
    />
  );
}
