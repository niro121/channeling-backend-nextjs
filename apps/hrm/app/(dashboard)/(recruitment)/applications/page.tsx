import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { formatDate, formatDateTime } from '@/lib/utils/date';
import {
  getApplicationFormOptionsAction,
  getApplicationSummaryAction,
  getApplicationsAction,
  getApplicationsExport
} from '@/app/actions/recruitment-actions/application.actions';
import {
  APPLICATION_SOURCE_LABELS,
  APPLICATION_STAGE_LABELS,
  APPLICATION_STATUS_LABELS,
  type ApplicationFilters,
  type ApplicationSource,
  type ApplicationStage,
  type ApplicationStatus,
  type ApplicationSummary,
  type VacancySelectOption
} from '@/types/recruitment';
import ApplicationsWorkspace from './applications-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    jobPostId?: string;
    jobTitle?: string;
    candidateName?: string;
    applicationId?: string;
    applicationDate?: string;
    department?: string;
    status?: string;
    source?: string;
    search?: string;
  }>;
};

function normalizeFilter(value?: string): string | undefined {
  if (!value || value === '__all__') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

const EMPTY_SUMMARY: ApplicationSummary = {
  applied: 0,
  screening: 0,
  shortlisted: 0,
  interview: 0,
  selected: 0,
  offer: 0,
  hired: 0,
  rejected: 0
};

export default async function ApplicationsPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/applications');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'applications.visited',
      entityType: 'Application',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters: ApplicationFilters = {
    jobPostId: normalizeFilter(params?.jobPostId),
    jobTitle: normalizeFilter(params?.jobTitle),
    candidateName: normalizeFilter(params?.candidateName),
    applicationId: normalizeFilter(params?.applicationId),
    applicationDate: normalizeFilter(params?.applicationDate),
    department: normalizeFilter(params?.department),
    status: normalizeFilter(params?.status),
    source: normalizeFilter(params?.source),
    search: normalizeFilter(params?.search)
  };

  const [listRes, summaryRes, optionsRes] = await Promise.all([
    getApplicationsAction({
      ...filters,
      page: params?.page,
      limit: process.env.DEFAULT_PER_PAGE
    }),
    getApplicationSummaryAction(),
    getApplicationFormOptionsAction()
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
  const publishedJobPosts: VacancySelectOption[] =
    optionsRes.data?.publishedJobPosts ?? [];

  const handleExport = async () => {
    'use server';

    const exportResponse = await getApplicationsExport({
      jobPostId: filters.jobPostId,
      jobTitle: filters.jobTitle,
      candidateName: filters.candidateName,
      applicationId: filters.applicationId,
      applicationDate: filters.applicationDate,
      department: filters.department,
      status: filters.status,
      source: filters.source,
      search: filters.search
    });

    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No applications found'
          : exportResponse.message
      };
    }

    return {
      success: true,
      data: exportResponse.data.map((row) => ({
        applicationId: row.applicationId || '-',
        candidateName: row.candidateName || '-',
        jobPostCode: row.jobPostCode || '-',
        jobTitle: row.jobTitle || '-',
        department: row.department || '-',
        appliedDate: row.appliedDate ? formatDate(row.appliedDate) : '-',
        experienceYears: `${row.experienceYears} yrs`,
        source:
          APPLICATION_SOURCE_LABELS[row.source as ApplicationSource] ??
          row.source ??
          '-',
        currentStage:
          APPLICATION_STAGE_LABELS[row.currentStage as ApplicationStage] ??
          row.currentStage ??
          '-',
        status:
          APPLICATION_STATUS_LABELS[row.status as ApplicationStatus] ??
          row.status ??
          '-',
        createdAt: row.createdAt ? formatDateTime(row.createdAt) : '-',
        updatedAt: row.updatedAt ? formatDateTime(row.updatedAt) : '-'
      }))
    };
  };

  return (
    <ApplicationsWorkspace
      initialRecords={records}
      totalRecords={totalRecords}
      summary={summary}
      page={params?.page}
      initialFilters={filters}
      departmentOptions={departmentOptions}
      jobPostOptions={jobPostOptions}
      publishedJobPosts={publishedJobPosts}
      onExport={handleExport}
    />
  );
}
