import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import NightShiftsWorkspace from './night-shifts-workspace';
import { SAMPLE_NIGHT_SHIFTS, SAMPLE_NIGHT_SUMMARY } from './sample-data';

export default async function NightShiftsPage() {
  const canView = await checkRouteAccess('/night-shifts');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'night-shifts.visited',
      entityType: 'NightShift',
      importance: 'low'
    });
  }

  return (
    <NightShiftsWorkspace
      initialRows={SAMPLE_NIGHT_SHIFTS}
      summary={SAMPLE_NIGHT_SUMMARY}
    />
  );
}
