import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import PublicHolidayShiftsWorkspace from './public-holiday-shifts-workspace';
import {
  SAMPLE_HOLIDAY_SUMMARY,
  SAMPLE_PUBLIC_HOLIDAY_SHIFTS
} from './sample-data';

export default async function PublicHolidayShiftsPage() {
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

  return (
    <PublicHolidayShiftsWorkspace
      initialRows={SAMPLE_PUBLIC_HOLIDAY_SHIFTS}
      summary={SAMPLE_HOLIDAY_SUMMARY}
    />
  );
}
