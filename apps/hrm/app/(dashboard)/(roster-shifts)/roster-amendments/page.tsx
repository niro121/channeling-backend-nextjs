import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import RosterAmendmentsWorkspace from './roster-amendments-workspace';
import {
  SAMPLE_AMENDMENT_SUMMARY,
  SAMPLE_ROSTER_AMENDMENTS
} from './sample-data';

export default async function RosterAmendmentsPage() {
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

  return (
    <RosterAmendmentsWorkspace
      initialRows={SAMPLE_ROSTER_AMENDMENTS}
      summary={SAMPLE_AMENDMENT_SUMMARY}
    />
  );
}
