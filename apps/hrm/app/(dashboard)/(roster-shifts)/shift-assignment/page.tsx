import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import ShiftAssignmentWorkspace from './shift-assignment-workspace';
import {
  SAMPLE_SHIFT_ASSIGNMENTS,
  SAMPLE_ASSIGNMENT_SUMMARY
} from './sample-data';

export default async function ShiftAssignmentPage() {
  const canView = await checkRouteAccess('/shift-assignment');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'shift-assignment.visited',
      entityType: 'ShiftAssignment',
      importance: 'low'
    });
  }

  return (
    <ShiftAssignmentWorkspace
      initialRows={SAMPLE_SHIFT_ASSIGNMENTS}
      summary={SAMPLE_ASSIGNMENT_SUMMARY}
    />
  );
}
