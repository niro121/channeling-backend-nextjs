'use client';

import { useMemo } from 'react';
import { addDays, format, subDays } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { Button } from '@archmage/ui';
import { cn } from '@/lib/utils';
import type {
  InterviewFilters,
  InterviewRecord
} from '@/types/recruitment';
import { useInterviewScheduleUi } from './interview-schedule-ui-context';
import SectionCalendar from './section-calendar';
import SectionFilters from './section-filters';
import SectionList from './section-list';

type SectionRegisterProps = {
  records?: InterviewRecord[];
  totalRecords?: number;
  page?: string;
  initialFilters?: InterviewFilters;
};

function ViewToolbar() {
  const { viewMode, setViewMode, weekStart, setWeekStart } =
    useInterviewScheduleUi();
  const weekLabel = `Interviews — Week of ${format(weekStart, 'dd MMM yyyy')}`;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold">{weekLabel}</h2>
        <p className="text-sm text-muted-foreground">
          Plan, confirm and run candidate interviews.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Previous week"
            onClick={() => setWeekStart(subDays(weekStart, 7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Next week"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            className={cn(
              'h-8 gap-1.5 px-2.5',
              viewMode === 'calendar' && 'bg-primary text-primary-foreground'
            )}
            onClick={() => setViewMode('calendar')}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            className={cn(
              'h-8 gap-1.5 px-2.5',
              viewMode === 'list' && 'bg-primary text-primary-foreground'
            )}
            onClick={() => setViewMode('list')}
          >
            <List className="h-3.5 w-3.5" />
            List
          </Button>
        </div>
      </div>
    </div>
  );
}

function weekDayKeys(weekStart: Date): Set<string> {
  return new Set(
    Array.from({ length: 5 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'))
  );
}

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  initialFilters = {}
}: SectionRegisterProps) {
  const { viewMode, weekStart } = useInterviewScheduleUi();

  const weekRecords = useMemo(() => {
    const keys = weekDayKeys(weekStart);
    return records.filter((row) => keys.has(row.interviewDate));
  }, [records, weekStart]);

  return (
    <div className="space-y-4">
      <SectionFilters initial={initialFilters} />

      {viewMode === 'calendar' ? (
        <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
          <ViewToolbar />
          <SectionCalendar records={weekRecords} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <ViewToolbar />
          </div>
          <SectionList
            records={weekRecords}
            totalRecords={weekRecords.length || totalRecords}
            page={page}
          />
        </div>
      )}
    </div>
  );
}
