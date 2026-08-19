import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getPublicHolidayShiftsAction,
  getPublicHolidayShiftFilterOptionsAction,
  getPublicHolidayShiftFormOptionsAction
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

  return (
    <PublicHolidayShiftsWorkspace
      initialRows={records}
      totalRecords={totalRecords}
      summary={summary}
      initialFilters={filterResult.data ?? null}
      formOptions={formResult.data ?? null}
    />
  );
}
