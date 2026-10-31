import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { formatDate, formatDateTime } from '@/lib/utils/date';
import {
  getJobPostFormOptionsAction,
  getJobPostSummaryAction,
  getJobPostsAction,
  getJobPostsExport
} from '@/app/actions/recruitment-actions/job-post.actions';
import {
  JOB_POST_STATUS_LABELS,
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  type JobPostFilters,
  type JobPostStatus,
  type JobPostSummary,
  type VacancyEmploymentType,
  type VacancySelectOption,
  type ApprovedVacancyOption
} from '@/types/recruitment';
import JobPostsWorkspace from './job-posts-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    jobTitle?: string;
    department?: string;
    designation?: string;
    employmentType?: string;
    status?: string;
    postedDate?: string;
    closingDate?: string;
    search?: string;
    prefillVacancyId?: string;
  }>;
};

function normalizeFilter(value?: string): string | undefined {
  if (!value || value === '__all__') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

const EMPTY_SUMMARY: JobPostSummary = {
  published: 0,
  unpublished: 0,
  applications: 0,
  closingThisWeek: 0
};

export default async function JobPostsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/job-posts');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'job-posts.visited',
      entityType: 'JobPost',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters: JobPostFilters = {
    jobTitle: normalizeFilter(params?.jobTitle),
    department: normalizeFilter(params?.department),
    designation: normalizeFilter(params?.designation),
    employmentType: normalizeFilter(params?.employmentType),
    status: normalizeFilter(params?.status),
    postedDate: normalizeFilter(params?.postedDate),
    closingDate: normalizeFilter(params?.closingDate),
    search: normalizeFilter(params?.search)
  };

  const prefillVacancyId = normalizeFilter(params?.prefillVacancyId);

  const [listRes, summaryRes, optionsRes] = await Promise.all([
    getJobPostsAction({
      ...filters,
      page: params?.page,
      limit: process.env.DEFAULT_PER_PAGE
    }),
    getJobPostSummaryAction(),
    getJobPostFormOptionsAction()
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
  const approvedVacancies: ApprovedVacancyOption[] =
    optionsRes.data?.approvedVacancies ?? [];

  const handleExport = async () => {
    'use server';

    const exportResponse = await getJobPostsExport({
      jobTitle: filters.jobTitle,
      department: filters.department,
      designation: filters.designation,
      employmentType: filters.employmentType,
      status: filters.status,
      postedDate: filters.postedDate,
      closingDate: filters.closingDate,
      search: filters.search
    });

    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No job posts found'
          : exportResponse.message
      };
    }

    return {
      success: true,
      data: exportResponse.data.map((row) => ({
        jobPostId: row.jobPostId || '-',
        jobTitle: row.jobTitle || '-',
        department: row.department || '-',
        designation: row.designation || '-',
        employmentType:
          VACANCY_EMPLOYMENT_TYPE_LABELS[
            row.employmentType as VacancyEmploymentType
          ] ??
          row.employmentType ??
          '-',
        openings: row.openings,
        postedDate: row.postedDate ? formatDate(row.postedDate) : '-',
        closingDate: row.closingDate ? formatDate(row.closingDate) : '-',
        applicationsCount: row.applicationsCount,
        status:
          JOB_POST_STATUS_LABELS[row.status as JobPostStatus] ??
          row.status ??
          '-',
        createdAt: row.createdAt ? formatDateTime(row.createdAt) : '-',
        updatedAt: row.updatedAt ? formatDateTime(row.updatedAt) : '-'
      }))
    };
  };

  return (
    <JobPostsWorkspace
      initialRecords={records}
      totalRecords={totalRecords}
      summary={summary}
      page={params?.page}
      initialFilters={filters}
      departmentOptions={departmentOptions}
      designationOptions={designationOptions}
      approvedVacancies={approvedVacancies}
      initialPrefillVacancyIds={
        prefillVacancyId ? [prefillVacancyId] : undefined
      }
      onExport={handleExport}
    />
  );
}
