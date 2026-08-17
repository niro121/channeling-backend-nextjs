import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import DutyRosterWorkspace from './duty-roster-workspace';
import { SAMPLE_DUTY_ROSTER_ROWS, SAMPLE_DUTY_SUMMARY } from './sample-data';

export default async function DutyRosterPage() {
  const canView = await checkRouteAccess('/duty-roster');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'duty-roster.visited',
      entityType: 'DutyRoster',
      importance: 'low'
    });
  }

  return (
    <DutyRosterWorkspace
      initialRows={SAMPLE_DUTY_ROSTER_ROWS}
      summary={SAMPLE_DUTY_SUMMARY}
    />
  );
}
