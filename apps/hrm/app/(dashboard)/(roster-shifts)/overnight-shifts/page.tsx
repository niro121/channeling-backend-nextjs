import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import OvernightShiftsWorkspace from './overnight-shifts-workspace';
import {
  SAMPLE_OVERNIGHT_SHIFTS,
  SAMPLE_OVERNIGHT_SUMMARY
} from './sample-data';

export default async function OvernightShiftsPage() {
  const canView = await checkRouteAccess('/overnight-shifts');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'overnight-shifts.visited',
      entityType: 'OvernightShift',
      importance: 'low'
    });
  }

  return (
    <OvernightShiftsWorkspace
      initialRows={SAMPLE_OVERNIGHT_SHIFTS}
      summary={SAMPLE_OVERNIGHT_SUMMARY}
    />
  );
}
