import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import type {
  VacancyRequestFilters,
  VacancyRequestRecord
} from '@/types/recruitment';
import {
  SAMPLE_VACANCY_REQUESTS,
  SAMPLE_VACANCY_SUMMARY
} from './sample-data';
import VacancyRequestsWorkspace from './vacancy-requests-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    requestId?: string;
    department?: string;
    designation?: string;
    employmentType?: string;
    requestedBy?: string;
    requestDate?: string;
    requiredDate?: string;
    status?: string;
    search?: string;
  }>;
};

function normalizeFilter(value?: string): string | undefined {
  if (!value || value === '__all__') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function filterVacancyRequests(
  records: VacancyRequestRecord[],
  filters: VacancyRequestFilters
): VacancyRequestRecord[] {
  const requestId = filters.requestId?.toLowerCase();
  const department = filters.department?.toLowerCase();
  const designation = filters.designation?.toLowerCase();
  const employmentType = filters.employmentType?.toLowerCase();
  const requestedBy = filters.requestedBy?.toLowerCase();
  const status = filters.status?.toLowerCase();
  const search = filters.search?.toLowerCase();

  return records.filter((row) => {
    if (requestId && !row.requestId.toLowerCase().includes(requestId)) {
      return false;
    }
    if (department && row.department.toLowerCase() !== department) {
      return false;
    }
    if (designation && row.designation.toLowerCase() !== designation) {
      return false;
    }
    if (
      employmentType &&
      row.employmentType.toLowerCase() !== employmentType
    ) {
      return false;
    }
    if (
      requestedBy &&
      !row.requestedBy.toLowerCase().includes(requestedBy)
    ) {
      return false;
    }
    if (filters.requestDate && row.requestedDate !== filters.requestDate) {
      return false;
    }
    if (filters.requiredDate && row.requiredDate !== filters.requiredDate) {
      return false;
    }
    if (status && row.status.toLowerCase() !== status) {
      return false;
    }
    if (search) {
      const haystack = [
        row.requestId,
        row.department,
        row.designation,
        row.requestedBy,
        row.employmentType,
        row.status
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export default async function VacancyRequestsPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/vacancy-requests');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'vacancy-requests.visited',
      entityType: 'VacancyRequest',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters: VacancyRequestFilters = {
    requestId: normalizeFilter(params?.requestId),
    department: normalizeFilter(params?.department),
    designation: normalizeFilter(params?.designation),
    employmentType: normalizeFilter(params?.employmentType),
    requestedBy: normalizeFilter(params?.requestedBy),
    requestDate: normalizeFilter(params?.requestDate),
    requiredDate: normalizeFilter(params?.requiredDate),
    status: normalizeFilter(params?.status),
    search: normalizeFilter(params?.search)
  };

  const filtered = filterVacancyRequests(SAMPLE_VACANCY_REQUESTS, filters);
  const pageSize = process.env.DEFAULT_PER_PAGE
    ? Number(process.env.DEFAULT_PER_PAGE)
    : 10;
  const pageNumber = params?.page ? Math.max(1, Number(params.page) || 1) : 1;
  const start = (pageNumber - 1) * pageSize;
  const pageRecords = filtered.slice(start, start + pageSize);

  return (
    <VacancyRequestsWorkspace
      initialRecords={pageRecords}
      totalRecords={filtered.length}
      summary={SAMPLE_VACANCY_SUMMARY}
      page={params?.page}
      initialFilters={filters}
    />
  );
}
