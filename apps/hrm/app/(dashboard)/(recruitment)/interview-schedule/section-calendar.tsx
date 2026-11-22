'use client';

import { addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  INTERVIEW_TYPE_LABELS,
  type InterviewRecord
} from '@/types/recruitment';
import InterviewStatusBadge from './status-badge';
import { useInterviewScheduleUi } from './interview-schedule-ui-context';

type SectionCalendarProps = {
  records: InterviewRecord[];
};

function toYmd(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export default function SectionCalendar({ records }: SectionCalendarProps) {
  const { weekStart, openView } = useInterviewScheduleUi();
  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {days.map((day) => {
        const dayKey = toYmd(day);
        const dayRecords = records
          .filter((r) => r.interviewDate === dayKey)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        return (
          <div
            key={dayKey}
            className="min-h-[16rem] rounded-lg border border-border bg-muted/10 p-3"
          >
            <p className="mb-3 text-sm font-semibold text-foreground">
              {format(day, 'EEE dd MMM')}
            </p>
            <div className="space-y-2">
              {dayRecords.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No interviews
                </p>
              ) : (
                dayRecords.map((record) => {
                  const accent =
                    record.status === 'confirmed' ||
                    record.status === 'completed';

                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => openView(record)}
                      className={cn(
                        'w-full rounded-md border border-border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/40',
                        accent && 'border-l-4 border-l-primary'
                      )}
                    >
                      <p className="text-xs font-medium tabular-nums text-muted-foreground">
                        {record.startTime}–{record.endTime}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {record.candidateName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {record.jobTitle} ·{' '}
                        {INTERVIEW_TYPE_LABELS[record.interviewType]}
                      </p>
                      <div className="mt-2">
                        <InterviewStatusBadge status={record.status} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
