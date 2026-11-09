import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getNightShiftFilterOptionsAction,
  getNightShiftFormOptionsAction,
  getNightShiftsAction,
  getNightShiftsExportAction
} from '@/app/actions/roster-actions/night-shift.actions';
import { formatNightHours, formatNightMoney } from '@/lib/utils/night-shift';
import {
  NIGHT_SHIFT_STATUS_OPTIONS,
  type NightShiftSummary
} from '@/types/roster';
import NightShiftsWorkspace from './night-shifts-workspace';
import type { NightFilterValues } from './section-night-filters';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    fromDate?: string;
    toDate?: string;
    department?: string;
    unit?: string;
    shiftTypeId?: string;
    staffSearch?: string;
    status?: string;
  }>;
};

const EMPTY_SUMMARY: NightShiftSummary = {
  nightShiftsThisCycle: 0,
  cycleLabel: '',
  staffOnNightDuty: 0,
  staffUnitsLabel: 'Across all units',
  nightAllowancePayable: '0.00',
  consecutiveNightAlerts: 0
};

export default async function NightShiftsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/night-shifts');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'night-shifts.visited',
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
    staffSearch: params?.staffSearch,
    status: params?.status
  };

  const initialFilters: NightFilterValues = {
    fromDate: params?.fromDate ? new Date(params.fromDate) : null,
    toDate: params?.toDate ? new Date(params.toDate) : null,
    departmentId: params?.department ?? '',
    unitId: params?.unit ?? '',
    shiftTypeId: params?.shiftTypeId ?? '',
    staffSearch: params?.staffSearch ?? '',
    statusId: params?.status ?? '',
    salaryCycleId: ''
  };

  const [listRes, filterRes, formOptionsRes] = await Promise.all([
    getNightShiftsAction(listParams),
    getNightShiftFilterOptionsAction(),
    getNightShiftFormOptionsAction()
  ]);

  const records = listRes.isError ? [] : (listRes.data?.data ?? []);
  const totalRecords = listRes.isError ? 0 : (listRes.data?.totalRecords ?? 0);
  const summary = listRes.isError
    ? EMPTY_SUMMARY
    : (listRes.data?.summary ?? EMPTY_SUMMARY);
  const filterOptions = filterRes.isError
    ? { departments: [], units: [], shiftTypes: [], statuses: [] }
    : (filterRes.data ?? {
        departments: [],
        units: [],
        shiftTypes: [],
        statuses: []
      });
  const formOptions = formOptionsRes.isError
    ? { staff: [], shiftTypes: [] }
    : (formOptionsRes.data ?? { staff: [], shiftTypes: [] });

  const handleExport = async () => {
    'use server';

    const exportResponse = await getNightShiftsExportAction(listParams);
    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No night shifts found'
          : (exportResponse.message ?? 'Failed to export night shifts')
      };
    }

    const statusLabels = Object.fromEntries(
      NIGHT_SHIFT_STATUS_OPTIONS.map((option) => [option.id, option.name])
    );

    return {
      success: true,
      data: exportResponse.data.map((row) => ({
        staffCode: row.staffCode,
        staffName: row.staffName,
        department: row.department,
        unit: row.unit,
        shiftDate: row.shiftDate ? row.shiftDate.slice(0, 10) : '',
        nightShift: row.nightShift,
        nightHours: formatNightHours(row.nightHours),
        nightOt: formatNightHours(row.nightOt),
        nightAllowance: formatNightMoney(row.nightAllowance),
        mealAllowance: formatNightMoney(row.mealAllowance),
        consecutiveNights: row.consecutiveNights,
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
    <NightShiftsWorkspace
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
