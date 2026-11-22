import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getOvernightShiftFilterOptionsAction,
  getOvernightShiftFormOptionsAction,
  getOvernightShiftsAction,
  getOvernightShiftsExportAction
} from '@/app/actions/roster-actions/overnight-shift.actions';
import {
  formatOvernightHours,
  formatOvernightMoney
} from '@/lib/utils/overnight-shift';
import {
  OVERNIGHT_ALLOCATION_OPTIONS,
  OVERNIGHT_SHIFT_STATUS_OPTIONS,
  type OvernightShiftSummary
} from '@/types/roster';
import OvernightShiftsWorkspace from './overnight-shifts-workspace';
import type { OvernightFilterValues } from './section-overnight-filters';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    fromDate?: string;
    toDate?: string;
    department?: string;
    unit?: string;
    shiftTypeId?: string;
    allocationDate?: string;
    staffSearch?: string;
    status?: string;
  }>;
};

const EMPTY_SUMMARY: OvernightShiftSummary = {
  overnightShifts: 0,
  cycleLabel: '',
  crossMidnightHours: 0,
  overnightOtHours: 0,
  allocationConflicts: 0
};

export default async function OvernightShiftsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/overnight-shifts');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'overnight-shifts.visited',
      entityType: 'RosterAllocation',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const listParams = {
    page: params?.page,
    limit: params?.limit,
    fromDate: params?.fromDate,
    toDate: params?.toDate,
    department: params?.department,
    unit: params?.unit,
    shiftTypeId: params?.shiftTypeId,
    allocationDate: params?.allocationDate,
    staffSearch: params?.staffSearch,
    status: params?.status
  };

  const initialFilters: OvernightFilterValues = {
    fromDate: params?.fromDate ? new Date(params.fromDate) : null,
    toDate: params?.toDate ? new Date(params.toDate) : null,
    departmentId: params?.department ?? '',
    unitId: params?.unit ?? '',
    shiftTypeId: params?.shiftTypeId ?? '',
    allocationId: params?.allocationDate ?? '',
    staffSearch: params?.staffSearch ?? '',
    statusId: params?.status ?? ''
  };

  const [listRes, filterRes, formOptionsRes] = await Promise.all([
    getOvernightShiftsAction(listParams),
    getOvernightShiftFilterOptionsAction(),
    getOvernightShiftFormOptionsAction()
  ]);

  const records = listRes.isError ? [] : (listRes.data?.data ?? []);
  const totalRecords = listRes.isError ? 0 : (listRes.data?.totalRecords ?? 0);
  const summary = listRes.isError
    ? EMPTY_SUMMARY
    : (listRes.data?.summary ?? EMPTY_SUMMARY);
  const filterOptions = filterRes.isError
    ? { departments: [], units: [], shiftTypes: [], allocationOptions: [], statuses: [] }
    : (filterRes.data ?? {
        departments: [],
        units: [],
        shiftTypes: [],
        allocationOptions: [],
        statuses: []
      });
  const formOptions = formOptionsRes.isError
    ? { staff: [], shiftTypes: [] }
    : (formOptionsRes.data ?? { staff: [], shiftTypes: [] });

  const handleExport = async () => {
    'use server';

    const exportResponse = await getOvernightShiftsExportAction(listParams);
    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No overnight shifts found'
          : (exportResponse.message ?? 'Failed to export overnight shifts')
      };
    }

    const statusLabels = Object.fromEntries(
      OVERNIGHT_SHIFT_STATUS_OPTIONS.map((option) => [option.id, option.name])
    );
    const allocationLabels = Object.fromEntries(
      OVERNIGHT_ALLOCATION_OPTIONS.map((option) => [option.id, option.name])
    );

    return {
      success: true,
      data: exportResponse.data.map((row) => ({
        staffCode: row.staffCode,
        staffName: row.staffName,
        department: row.department,
        unit: row.unit,
        overnightShift: row.overnightShift,
        startDate: row.startDate ? row.startDate.slice(0, 10) : '',
        endDate: row.endDate ? row.endDate.slice(0, 10) : '',
        startTime: row.startTime,
        endTime: row.endTime,
        day1Hours: formatOvernightHours(row.day1Hours),
        day2Hours: formatOvernightHours(row.day2Hours),
        totalHours: formatOvernightHours(row.totalHours),
        attendanceAllocation:
          allocationLabels[row.attendanceAllocation] ??
          row.attendanceAllocation,
        attendanceDate: row.attendanceDate
          ? row.attendanceDate.slice(0, 10)
          : '',
        overnightOt: formatOvernightHours(row.overnightOt),
        overnightAllowance: formatOvernightMoney(row.overnightAllowance),
        payrollReady: row.payrollReady ? 'Yes' : 'No',
        status: statusLabels[row.status] ?? row.status,
        updatedBy: row.updatedUser?.name ?? '',
        updatedAt: row.updatedAt,
        createdBy: row.createdUser?.name ?? '',
        createdAt: row.createdAt
      }))
    };
  };

  return (
    <OvernightShiftsWorkspace
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
