'use client';

import { useEffect, useState } from 'react';
import {
  Badge,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@archmage/ui';
import { getAttendanceSummaryDetailAction } from '@/app/actions/attendance-actions/attendance-summary.actions';
import { cn } from '@/lib/utils';
import type {
  AttendanceSummaryDetail,
  AttendanceSummaryRow
} from '@/types/attendance';

type SheetSummaryDetailProps = {
  open: boolean;
  record: AttendanceSummaryRow | null;
  fromDate: string;
  toDate: string;
  onOpenChange: (open: boolean) => void;
};

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  late: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  early_out: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  absent: 'bg-red-100 text-red-700 hover:bg-red-100',
  missing_punch: 'bg-rose-100 text-rose-700 hover:bg-rose-100',
  leave: 'bg-sky-100 text-sky-800 hover:bg-sky-100',
  holiday: 'bg-violet-100 text-violet-800 hover:bg-violet-100',
  day_off: 'bg-slate-100 text-slate-700 hover:bg-slate-100'
};

export default function SheetSummaryDetail({
  open,
  record,
  fromDate,
  toDate,
  onOpenChange
}: SheetSummaryDetailProps) {
  const [detail, setDetail] = useState<AttendanceSummaryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !record?.staffId) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      const result = await getAttendanceSummaryDetailAction({
        staffId: record.staffId,
        fromDate,
        toDate
      });
      if (cancelled) return;
      setLoading(false);
      if (result.isError || !result.data) {
        setDetail(null);
        setError(
          (result.errors as { message?: string })?.message ??
            'Could not load details.'
        );
        return;
      }
      setDetail(result.data);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, record?.staffId, fromDate, toDate]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {record
              ? `${record.staffName} (${record.staffCode})`
              : 'Staff summary'}
          </SheetTitle>
          <SheetDescription>
            Day-by-day attendance for {fromDate} → {toDate}
            {record?.department ? ` · ${record.department}` : ''}.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-1 pb-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading details…</p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          {detail ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  ['Working', detail.totals.workingDays],
                  ['Present', detail.totals.presentDays],
                  ['Absent', detail.totals.absentDays],
                  ['Leave', detail.totals.leaveDays],
                  ['Holiday', detail.totals.holidayDays],
                  ['Day off', detail.totals.dayOffDays],
                  ['Late', detail.totals.lateCount],
                  ['Early out', detail.totals.earlyOutCount],
                  ['Missing', detail.totals.missingPunches],
                  ['OT hours', detail.totals.overtimeHours]
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-md border border-border px-3 py-2"
                  >
                    <p className="text-xs uppercase text-muted-foreground">
                      {label}
                    </p>
                    <p className="text-lg font-semibold tabular-nums">{value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Daily breakdown</p>
                {detail.days.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No attendance days in this period.
                  </p>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {detail.days.map((day) => (
                      <li
                        key={day.date}
                        className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium">{day.dateLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            {day.scheduledShift} · In {day.checkIn} · Out{' '}
                            {day.checkOut}
                          </p>
                        </div>
                        <Badge
                          className={cn(
                            'w-fit font-medium',
                            STATUS_STYLES[day.status] ??
                              'bg-slate-100 text-slate-700 hover:bg-slate-100'
                          )}
                        >
                          {day.statusLabel}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
