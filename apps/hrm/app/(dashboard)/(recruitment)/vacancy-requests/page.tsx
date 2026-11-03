import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { formatDate, formatDateTime } from '@/lib/utils/date';
import {
  getVacancyRequestFormOptionsAction,
  getVacancyRequestSummaryAction,
  getVacancyRequestsAction,
  getVacancyRequestsExport
} from '@/app/actions/recruitment-actions/vacancy-request.actions';
import {
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  VACANCY_PRIORITY_LABELS,
  VACANCY_REQUEST_STATUS_LABELS,
  type VacancyEmploymentType,
  type VacancyPriority,
  type VacancyRequestFilters,
  type VacancyRequestStatus,
  type VacancyRequestSummary,
  type VacancySelectOption
} from '@/types/recruitment';
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

const EMPTY_SUMMARY: VacancyRequestSummary = {
  openRequests: 0,
  pendingApproval: 0,
  approved: 0,
  totalPositions: 0
};

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

  const [listRes, summaryRes, optionsRes] = await Promise.all([
    getVacancyRequestsAction({
      ...filters,
      page: params?.page,
      limit: process.env.DEFAULT_PER_PAGE
    }),
    getVacancyRequestSummaryAction(),
    getVacancyRequestFormOptionsAction()
  ]);

  const records = listRes.isError ? [] : (listRes.data?.data ?? []);
  const totalRecords = listRes.isError
    ? 0
    : (listRes.data?.totalRecords ?? 0);
  const summary = summaryRes.isError
    ? EMPTY_SUMMARY
    : (summaryRes.data ?? EMPTY_SUMMARY);
  const departmentOptions: VacancySelectOption[] = optionsRes.data
    ?.departments ?? [];
  const designationOptions: VacancySelectOption[] = optionsRes.data
    ?.designations ?? [];

  const handleExport = async () => {
    'use server';

    const exportResponse = await getVacancyRequestsExport({
      requestId: filters.requestId,
      department: filters.department,
      designation: filters.designation,
      employmentType: filters.employmentType,
      requestedBy: filters.requestedBy,
      requestDate: filters.requestDate,
      requiredDate: filters.requiredDate,
      status: filters.status,
      search: filters.search
    });

    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No vacancy requests found'
          : exportResponse.message
      };
    }

    return {
      success: true,
      data: exportResponse.data.map((row) => ({
        requestId: row.requestId || '-',
        department: row.department || '-',
        designation: row.designation || '-',
        vacancies: row.vacancies,
        employmentType:
          VACANCY_EMPLOYMENT_TYPE_LABELS[
            row.employmentType as VacancyEmploymentType
          ] ??
          row.employmentType ??
          '-',
        requestedBy: row.requestedBy || '-',
        requestedDate: row.requestedDate
          ? formatDate(row.requestedDate)
          : '-',
        requiredDate: row.requiredDate ? formatDate(row.requiredDate) : '-',
        priority:
          VACANCY_PRIORITY_LABELS[row.priority as VacancyPriority] ??
          row.priority ??
          '-',
        status:
          VACANCY_REQUEST_STATUS_LABELS[row.status as VacancyRequestStatus] ??
          row.status ??
          '-',
        createdAt: row.createdAt ? formatDateTime(row.createdAt) : '-',
        updatedAt: row.updatedAt ? formatDateTime(row.updatedAt) : '-'
      }))
    };
  };

  return (
    <VacancyRequestsWorkspace
      initialRecords={records}
      totalRecords={totalRecords}
      summary={summary}
      page={params?.page}
      initialFilters={filters}
      departmentOptions={departmentOptions}
      designationOptions={designationOptions}
      onExport={handleExport}
    />
  );
}
