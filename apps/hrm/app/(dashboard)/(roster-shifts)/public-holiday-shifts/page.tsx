import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getPublicHolidayShiftsAction,
  getPublicHolidayShiftFilterOptionsAction,
  getPublicHolidayShiftFormOptionsAction,
  getPublicHolidayShiftsExport
} from '@/app/actions/roster-actions/public-holiday-shift.actions';
import type { GetPublicHolidayShiftsParams } from '@/types/roster';
import PublicHolidayShiftsWorkspace from './public-holiday-shifts-workspace';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toStr(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

export default async function PublicHolidayShiftsPage({
  searchParams
}: PageProps) {
  const canView = await checkRouteAccess('/public-holiday-shifts');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'public-holiday-shifts.visited',
      entityType: 'PublicHolidayShift',
      importance: 'low'
    });
  }

  const sp = await searchParams;
  const params: GetPublicHolidayShiftsParams = {
    page: toStr(sp.page) || '1',
    limit: toStr(sp.limit) || '10',
    holidayId: toStr(sp.holidayId),
    holidayTypeId: toStr(sp.holidayTypeId),
    fromDate: toStr(sp.fromDate),
    toDate: toStr(sp.toDate),
    department: toStr(sp.department),
    unit: toStr(sp.unit),
    payRate: toStr(sp.payRate),
    status: toStr(sp.status),
    search: toStr(sp.search)
  };

  const [listResult, filterResult, formResult] = await Promise.all([
    getPublicHolidayShiftsAction(params),
    getPublicHolidayShiftFilterOptionsAction(),
    getPublicHolidayShiftFormOptionsAction()
  ]);

  const records = listResult.data?.data ?? [];
  const totalRecords = listResult.data?.totalRecords ?? 0;
  const summary = listResult.data?.summary ?? {
    holidayDuties: 0,
    cycleLabel: '',
    staffOnHolidayDuty: 0,
    holidayPayPayableLabel: 'LKR 0.00',
    lieuDaysGranted: 0
  };

  const handleExport = async () => {
    'use server';

    const exportResponse = await getPublicHolidayShiftsExport(params);
    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No holiday shifts found'
          : (exportResponse.message ?? 'Failed to export holiday shifts')
      };
    }

    return {
      success: true,
      data: exportResponse.data.map((row) => ({
        staffCode: row.staffCode,
        staffName: row.staffName,
        department: row.department,
        unit: row.unit,
        holidayName: row.holidayName,
        holidayType: row.holidayType,
        dutyDate: row.dutyDate,
        shiftLabel: row.shiftLabel,
        workedHours: row.workedHours,
        payRate: row.payRate,
        holidayAllowance: row.holidayAllowance,
        dutyLocation: row.dutyLocation,
        lieuLeave: row.lieuLeave ? 'Yes' : 'No',
        sendToPayroll: row.sendToPayroll ? 'Yes' : 'No',
        status: row.status,
        updatedBy: row.updatedUser?.name ?? '',
        updatedAt: row.updatedAt,
        createdBy: row.createdUser?.name ?? '',
        createdAt: row.createdAt
      }))
    };
  };

  return (
    <PublicHolidayShiftsWorkspace
      initialRows={records}
      totalRecords={totalRecords}
      summary={summary}
      initialFilters={filterResult.data ?? null}
      formOptions={formResult.data ?? null}
      onExport={handleExport}
    />
  );
}
