import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { formatDate, formatDateTime } from '@/lib/utils/date';
import {
  getShortlistingAction,
  getShortlistingExport,
  getShortlistingFormOptionsAction,
  getShortlistingSummaryAction
} from '@/app/actions/recruitment-actions/shortlisting.actions';
import {
  APPLICATION_STAGE_LABELS,
  SHORTLISTING_STATUS_LABELS,
  type ApplicationStage,
  type ShortlistingFilters,
  type ShortlistingStatus,
  type ShortlistingSummary,
  type VacancySelectOption
} from '@/types/recruitment';
import ShortlistingWorkspace from './shortlisting-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    jobPostId?: string;
    department?: string;
    designation?: string;
    candidateName?: string;
    applicationDate?: string;
    experience?: string;
    status?: string;
    search?: string;
  }>;
};

function normalizeFilter(value?: string): string | undefined {
  if (!value || value === '__all__') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

const EMPTY_SUMMARY: ShortlistingSummary = {
  toReview: 0,
  shortlisted: 0,
  onHold: 0,
  avgScreeningScore: 0
};

export default async function ShortlistingPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/shortlisting');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'shortlisting.visited',
      entityType: 'Application',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters: ShortlistingFilters = {
    jobPostId: normalizeFilter(params?.jobPostId),
    department: normalizeFilter(params?.department),
    designation: normalizeFilter(params?.designation),
    candidateName: normalizeFilter(params?.candidateName),
    applicationDate: normalizeFilter(params?.applicationDate),
    experience: normalizeFilter(params?.experience),
    status: normalizeFilter(params?.status),
    search: normalizeFilter(params?.search)
  };

  const [listRes, summaryRes, optionsRes] = await Promise.all([
    getShortlistingAction({
      ...filters,
      page: params?.page,
      limit: process.env.DEFAULT_PER_PAGE
    }),
    getShortlistingSummaryAction(),
    getShortlistingFormOptionsAction()
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
  const designationOptions: VacancySelectOption[] =
    optionsRes.data?.designations ?? [];
  const jobPostOptions: VacancySelectOption[] =
    optionsRes.data?.jobPosts ?? [];

  const handleExport = async () => {
    'use server';

    const exportResponse = await getShortlistingExport({
      jobPostId: filters.jobPostId,
      department: filters.department,
      designation: filters.designation,
      candidateName: filters.candidateName,
      applicationDate: filters.applicationDate,
      experience: filters.experience,
      status: filters.status,
      search: filters.search
    });

    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No candidates found'
          : exportResponse.message
      };
    }

    return {
      success: true,
      data: exportResponse.data.map((row) => ({
        candidateName: row.candidateName || '-',
        applicationId: row.applicationId || '-',
        jobTitle: row.jobTitle || '-',
        qualifications: row.qualifications || '-',
        experienceYears: `${row.experienceYears} yrs`,
        skills: row.skills?.length ? row.skills.join(', ') : '-',
        appliedDate: row.appliedDate ? formatDate(row.appliedDate) : '-',
        screeningScore: row.screeningScore,
        currentStage:
          APPLICATION_STAGE_LABELS[row.currentStage as ApplicationStage] ??
          row.currentStage ??
          '-',
        shortlistStatus:
          SHORTLISTING_STATUS_LABELS[
            row.shortlistStatus as ShortlistingStatus
          ] ??
          row.shortlistStatus ??
          '-',
        createdAt: row.createdAt ? formatDateTime(row.createdAt) : '-',
        updatedAt: row.updatedAt ? formatDateTime(row.updatedAt) : '-'
      }))
    };
  };

  return (
    <ShortlistingWorkspace
      initialRecords={records}
      totalRecords={totalRecords}
      summary={summary}
      page={params?.page}
      initialFilters={filters}
      departmentOptions={departmentOptions}
      designationOptions={designationOptions}
      jobPostOptions={jobPostOptions}
      onExport={handleExport}
    />
  );
}
