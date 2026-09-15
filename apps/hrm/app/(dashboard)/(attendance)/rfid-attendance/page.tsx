import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getRfidAttendanceDashboardAction } from '@/app/actions/attendance-actions/rfid-attendance.actions';
import { logRfidAttendanceVisitAction } from '@/app/actions/attendance-actions/rfid-attendance.actions';
import RfidAttendanceWorkspace from './rfid-attendance-workspace';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function one(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function RfidAttendancePage({ searchParams }: PageProps) {
  const canView = await checkRouteAccess('/rfid-attendance');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  void logRfidAttendanceVisitAction();

  const params = (await searchParams) ?? {};
  const filters = {
    department: one(params.department),
    location: one(params.location),
    date: one(params.date),
    shiftTypeId: one(params.shiftTypeId),
    staffId: one(params.staffId)
  };

  const result = await getRfidAttendanceDashboardAction(filters);
  if (result.isError || !result.data) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        {result.errors?.message ?? 'Unable to load RFID attendance.'}
      </div>
    );
  }

  return (
    <RfidAttendanceWorkspace dashboard={result.data} filters={filters} />
  );
}
