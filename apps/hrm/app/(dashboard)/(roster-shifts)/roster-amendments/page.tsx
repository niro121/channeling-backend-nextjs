import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getRosterAmendmentFilterOptionsAction,
  getRosterAmendmentFormOptionsAction,
  getRosterAmendmentSummaryAction,
  getRosterAmendmentsAction,
  getRosterAmendmentsExportAction
} from '@/app/actions/roster-actions/roster-amendment.actions';
import type { RosterAmendmentSummary } from '@/types/roster';
import RosterAmendmentsWorkspace from './roster-amendments-workspace';
import type { AmendmentFilterValues } from './section-amendment-filters';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    amendmentNo?: string;
    staffSearch?: string;
    department?: string;
    amendmentType?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    requestedById?: string;
  }>;
};

const EMPTY_SUMMARY: RosterAmendmentSummary = {
  totalAmendments: 0,
  pendingApproval: 0,
  approved: 0,
  rejected: 0
};

export default async function RosterAmendmentsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/roster-amendments');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'roster-amendments.visited',
      entityType: 'RosterAmendment',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const listParams = {
    page: params?.page,
    limit: params?.limit,
    amendmentNo: params?.amendmentNo,
    staffSearch: params?.staffSearch,
    department: params?.department,
    amendmentType: params?.amendmentType,
    status: params?.status,
    fromDate: params?.fromDate,
    toDate: params?.toDate,
    requestedById: params?.requestedById
  };

  const initialFilters: AmendmentFilterValues = {
    amendmentNo: params?.amendmentNo ?? '',
    staffSearch: params?.staffSearch ?? '',
    departmentId: params?.department ?? '',
    amendmentTypeId: params?.amendmentType ?? '',
    fromDate: params?.fromDate ? new Date(params.fromDate) : null,
    toDate: params?.toDate ? new Date(params.toDate) : null,
    statusId: params?.status ?? '',
    requestedById: params?.requestedById ?? ''
  };

  const [listRes, summaryRes, filterRes, formOptionsRes] = await Promise.all([
    getRosterAmendmentsAction(listParams),
    getRosterAmendmentSummaryAction(),
    getRosterAmendmentFilterOptionsAction(),
    getRosterAmendmentFormOptionsAction()
  ]);

  const records = listRes.isError ? [] : (listRes.data?.data ?? []);
  const totalRecords = listRes.isError ? 0 : (listRes.data?.totalRecords ?? 0);
  const summary = summaryRes.isError
    ? EMPTY_SUMMARY
    : (summaryRes.data ?? EMPTY_SUMMARY);
  const filterOptions = filterRes.isError
    ? {
        departments: [],
        amendmentTypes: [],
        statuses: [],
        requesters: []
      }
    : (filterRes.data ?? {
        departments: [],
        amendmentTypes: [],
        statuses: [],
        requesters: []
      });
  const formOptions = formOptionsRes.isError
    ? {
        staff: [],
        replacementStaff: [],
        shiftTypes: [],
        amendmentTypes: [],
        statuses: [],
        requesters: []
      }
    : (formOptionsRes.data ?? {
        staff: [],
        replacementStaff: [],
        shiftTypes: [],
        amendmentTypes: [],
        statuses: [],
        requesters: []
      });

  const handleExport = async () => {
    'use server';

    const exportResponse = await getRosterAmendmentsExportAction(listParams);
    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.message ?? 'No amendments to export'
      };
    }
    return {
      success: true,
      data: exportResponse.data
    };
  };

  return (
    <RosterAmendmentsWorkspace
      records={records}
      totalRecords={totalRecords}
      page={params?.page}
      summary={summary}
      initialFilters={initialFilters}
      filterOptions={filterOptions}
      formOptions={formOptions}
      onExport={handleExport}
    />
  );
}
