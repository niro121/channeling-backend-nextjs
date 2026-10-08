import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import type {
  ApplicationFilters,
  ApplicationRecord
} from '@/types/recruitment';
import ApplicationsWorkspace from './applications-workspace';
import {
  SAMPLE_APPLICATIONS,
  SAMPLE_APPLICATION_SUMMARY
} from './sample-data';

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

function filterApplications(
  records: ApplicationRecord[],
  filters: ApplicationFilters
): ApplicationRecord[] {
  const jobPostId = filters.jobPostId?.toLowerCase();
  const jobTitle = filters.jobTitle?.toLowerCase();
  const candidateName = filters.candidateName?.toLowerCase();
  const applicationId = filters.applicationId?.toLowerCase();
  const department = filters.department?.toLowerCase();
  const status = filters.status?.toLowerCase();
  const source = filters.source?.toLowerCase();
  const search = filters.search?.toLowerCase();

  return records.filter((row) => {
    if (jobPostId && row.jobPostId.toLowerCase() !== jobPostId) return false;
    if (jobTitle && !row.jobTitle.toLowerCase().includes(jobTitle)) {
      return false;
    }
    if (
      candidateName &&
      !row.candidateName.toLowerCase().includes(candidateName)
    ) {
      return false;
    }
    if (
      applicationId &&
      !row.applicationId.toLowerCase().includes(applicationId)
    ) {
      return false;
    }
    if (
      filters.applicationDate &&
      row.appliedDate !== filters.applicationDate
    ) {
      return false;
    }
    if (department && row.department.toLowerCase() !== department) {
      return false;
    }
    if (status && row.status.toLowerCase() !== status) return false;
    if (source && row.source.toLowerCase() !== source) return false;
    if (search) {
      const haystack = [
        row.applicationId,
        row.candidateName,
        row.jobTitle,
        row.department,
        row.jobPostId,
        row.currentStage,
        row.status
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

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

  const filtered = filterApplications(SAMPLE_APPLICATIONS, filters);
  const pageSize = process.env.DEFAULT_PER_PAGE
    ? Number(process.env.DEFAULT_PER_PAGE)
    : 10;
  const pageNumber = params?.page ? Math.max(1, Number(params.page) || 1) : 1;
  const start = (pageNumber - 1) * pageSize;
  const pageRecords = filtered.slice(start, start + pageSize);

  return (
    <ApplicationsWorkspace
      initialRecords={pageRecords}
      totalRecords={filtered.length}
      summary={SAMPLE_APPLICATION_SUMMARY}
      page={params?.page}
      initialFilters={filters}
    />
  );
}
