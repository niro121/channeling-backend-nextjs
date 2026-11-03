'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@archmage/ui';
import { formatAmount, formatLkr } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/date';
import type { SalaryHistoryTimeline } from '@/types/payroll';

type SectionTimelineProps = {
  timeline: SalaryHistoryTimeline;
};

export default function SectionTimeline({ timeline }: SectionTimelineProps) {
  const hasStaff = Boolean(timeline.staffLabel);
  const events = timeline.events ?? [];

  return (
    <Card className="flex h-full flex-col rounded-lg border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Salary Timeline</CardTitle>
        {hasStaff ? (
          <p className="text-xs text-muted-foreground">{timeline.staffLabel}</p>
        ) : null}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="min-h-[12rem] flex-1 overflow-y-auto">
          {!hasStaff ? (
            <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
              Select a staff member (Staff or Staff Code) to view the salary
              timeline.
            </p>
          ) : events.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
              No timeline events for this staff yet.
            </p>
          ) : (
            <ol className="relative space-y-3 border-l border-primary/40 pl-5">
              {events.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[1.55rem] top-3 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                    <p className="text-sm font-medium">{event.title}</p>
                    {event.detail ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {event.detail}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.at ? formatDateTime(event.at, 'dd MMM yyyy') : '—'}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
          <div className="rounded-md border border-border bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Net (6 mo avg)
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {timeline.netSixMonthAvg != null
                ? formatLkr(timeline.netSixMonthAvg)
                : '—'}
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Change
              {timeline.changeSinceLabel
                ? ` since ${timeline.changeSinceLabel}`
                : ''}
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {timeline.changePercent != null
                ? `${timeline.changePercent > 0 ? '+' : ''}${formatAmount(timeline.changePercent)}%`
                : '—'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
