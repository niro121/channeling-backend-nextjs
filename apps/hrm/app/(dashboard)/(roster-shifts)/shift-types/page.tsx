import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import ShiftTypesWorkspace from './shift-types-workspace';
import {
  SAMPLE_SHIFT_TYPES,
  SAMPLE_SHIFT_TYPE_SUMMARY
} from './sample-data';

export default async function ShiftTypesPage() {
  const canView = await checkRouteAccess('/shift-types');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'shift-types.visited',
      entityType: 'ShiftType',
      importance: 'low'
    });
  }

  return (
    <ShiftTypesWorkspace
      initialRows={SAMPLE_SHIFT_TYPES}
      summary={SAMPLE_SHIFT_TYPE_SUMMARY}
    />
  );
}
