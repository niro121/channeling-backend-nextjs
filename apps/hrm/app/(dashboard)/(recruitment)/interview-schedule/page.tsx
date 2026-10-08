import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import type {
  InterviewFilters,
  InterviewRecord
} from '@/types/recruitment';
import InterviewScheduleWorkspace from './interview-schedule-workspace';
import {
  SAMPLE_INTERVIEWS,
  SAMPLE_INTERVIEW_SUMMARY,
  SAMPLE_WEEK_START
} from './sample-data';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
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

function filterInterviews(
  records: InterviewRecord[],
  filters: InterviewFilters
): InterviewRecord[] {
  const interviewer = filters.interviewer?.toLowerCase();
  const department = filters.department?.toLowerCase();
  const jobPostId = filters.jobPostId?.toLowerCase();
  const interviewType = filters.interviewType?.toLowerCase();
  const status = filters.status?.toLowerCase();
  const search = filters.search?.toLowerCase();

  return records.filter((row) => {
    if (
      filters.interviewDate &&
      row.interviewDate !== filters.interviewDate
    ) {
      return false;
    }
    if (
      interviewer &&
      !row.interviewerPanel.toLowerCase().includes(interviewer)
    ) {
      return false;
    }
    if (department && row.department.toLowerCase() !== department) {
      return false;
    }
    if (jobPostId && row.jobPostId.toLowerCase() !== jobPostId) return false;
    if (interviewType && row.interviewType.toLowerCase() !== interviewType) {
      return false;
    }
    if (status && row.status.toLowerCase() !== status) return false;
    if (search) {
      const haystack = [
        row.interviewCode,
        row.candidateName,
        row.jobTitle,
        row.department,
        row.interviewerPanel,
        row.location,
        row.applicationId
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

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
      entityType: 'InterviewSchedule',
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

  const filtered = filterInterviews(SAMPLE_INTERVIEWS, filters);

  return (
    <InterviewScheduleWorkspace
      initialRecords={filtered}
      totalRecords={filtered.length}
      summary={SAMPLE_INTERVIEW_SUMMARY}
      page={params?.page}
      initialFilters={filters}
      weekStartIso={params?.weekStart ?? SAMPLE_WEEK_START}
    />
  );
}
