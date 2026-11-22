'use client';

import { Suspense, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { addDays, format, subDays } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { Button } from '@archmage/ui';
import { cn } from '@/lib/utils';
import type {
  InterviewFilters,
  InterviewRecord,
  VacancySelectOption
} from '@/types/recruitment';
import {
  useInterviewScheduleUi,
  type InterviewViewMode
} from './interview-schedule-ui-context';
import SectionCalendar from './section-calendar';
import SectionFilters from './section-filters';
import SectionList from './section-list';

type SectionRegisterProps = {
  records?: InterviewRecord[];
  totalRecords?: number;
  page?: string;
  initialFilters?: InterviewFilters;
  departmentOptions?: VacancySelectOption[];
  jobPostOptions?: VacancySelectOption[];
};

function ViewToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { viewMode, setViewMode, weekStart, setWeekStart } =
    useInterviewScheduleUi();
  const weekLabel = `Interviews — Week of ${format(weekStart, 'dd MMM yyyy')}`;

  const pushScheduleParams = useCallback(
    (next: { weekStart?: Date; view?: InterviewViewMode; resetPage?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.weekStart) {
        params.set('weekStart', format(next.weekStart, 'yyyy-MM-dd'));
      }
      if (next.view) {
        if (next.view === 'calendar') {
          params.delete('view');
        } else {
          params.set('view', next.view);
        }
      }
      if (next.resetPage) {
        params.delete('page');
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const goPrevWeek = () => {
    const next = subDays(weekStart, 7);
    setWeekStart(next);
    pushScheduleParams({ weekStart: next, resetPage: true });
  };

  const goNextWeek = () => {
    const next = addDays(weekStart, 7);
    setWeekStart(next);
    pushScheduleParams({ weekStart: next, resetPage: true });
  };

  const switchView = (mode: InterviewViewMode) => {
    setViewMode(mode);
    pushScheduleParams({ view: mode, resetPage: true });
  };

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
            onClick={goPrevWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Next week"
            onClick={goNextWeek}
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
            onClick={() => switchView('calendar')}
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
            onClick={() => switchView('list')}
          >
            <List className="h-3.5 w-3.5" />
            List
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  initialFilters = {},
  departmentOptions = [],
  jobPostOptions = []
}: SectionRegisterProps) {
  const { viewMode } = useInterviewScheduleUi();

  return (
    <div className="space-y-4">
      <SectionFilters
        initial={initialFilters}
        departmentOptions={departmentOptions}
        jobPostOptions={jobPostOptions}
      />

      {viewMode === 'calendar' ? (
        <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
          <Suspense fallback={null}>
            <ViewToolbar />
          </Suspense>
          <SectionCalendar records={records} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <Suspense fallback={null}>
              <ViewToolbar />
            </Suspense>
          </div>
          <SectionList
            records={records}
            totalRecords={totalRecords}
            page={page}
          />
        </div>
      )}
    </div>
  );
}
