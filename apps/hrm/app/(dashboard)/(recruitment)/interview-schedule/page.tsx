import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { startOfWeek, format } from 'date-fns';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getInterviewFormOptionsAction,
  getInterviewSummaryAction,
  getInterviewsAction
} from '@/app/actions/recruitment-actions/interview.actions';
import type {
  InterviewFilters,
  InterviewSummary,
  VacancySelectOption
} from '@/types/recruitment';
import InterviewScheduleWorkspace from './interview-schedule-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    view?: string;
    interviewDate?: string;
    interviewer?: string;
    department?: string;
    jobPostId?: string;
    interviewType?: string;
    status?: string;
    search?: string;
    weekStart?: string;
  }>;
};

function normalizeFilter(value?: string): string | undefined {
  if (!value || value === '__all__') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

const EMPTY_SUMMARY: InterviewSummary = {
  thisWeek: 0,
  confirmed: 0,
  rescheduled: 0,
  noShow: 0
};

export default async function InterviewSchedulePage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/interview-schedule');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'interview_schedule.visited',
      entityType: 'Interview',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters: InterviewFilters = {
    interviewDate: normalizeFilter(params?.interviewDate),
    interviewer: normalizeFilter(params?.interviewer),
    department: normalizeFilter(params?.department),
    jobPostId: normalizeFilter(params?.jobPostId),
    interviewType: normalizeFilter(params?.interviewType),
    status: normalizeFilter(params?.status),
    search: normalizeFilter(params?.search)
  };

  const defaultWeekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    'yyyy-MM-dd'
  );
  const weekStartIso = params?.weekStart ?? defaultWeekStart;
  const viewMode = params?.view === 'list' ? 'list' : 'calendar';

  // Calendar: load the full Mon–Fri week window.
  // List: paginate within that same week (or interviewDate filter).
  const listQuery =
    viewMode === 'list'
      ? {
          page: params?.page,
          limit: process.env.DEFAULT_PER_PAGE
        }
      : {
          page: '1',
          limit: process.env.DEFAULT_PAGE_SIZE ?? process.env.DEFAULT_PER_PAGE
        };

  const [listRes, summaryRes, optionsRes] = await Promise.all([
    getInterviewsAction({
      ...filters,
      ...listQuery,
      // Exact-day filter wins in the service; otherwise scope to the active week.
      weekStart: filters.interviewDate ? undefined : weekStartIso
    }),
    getInterviewSummaryAction(),
    getInterviewFormOptionsAction()
  ]);

  const records = listRes.isError ? [] : (listRes.data?.data ?? []);
  const totalRecords = listRes.isError
    ? 0
    : (listRes.data?.totalRecords ?? 0);
  const summary = summaryRes.isError
    ? EMPTY_SUMMARY
    : (summaryRes.data ?? EMPTY_SUMMARY);
  const departmentOptions: VacancySelectOption[] =
    optionsRes.data?.departments ?? [];
  const jobPostOptions: VacancySelectOption[] =
    optionsRes.data?.jobPosts ?? [];
  const applicationOptions = optionsRes.data?.applications ?? [];

  return (
    <InterviewScheduleWorkspace
      initialRecords={records}
      totalRecords={totalRecords}
      summary={summary}
      page={params?.page}
      initialFilters={filters}
      weekStartIso={weekStartIso}
      viewMode={viewMode}
      departmentOptions={departmentOptions}
      jobPostOptions={jobPostOptions}
      applicationOptions={applicationOptions}
    />
  );
}
