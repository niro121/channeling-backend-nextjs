import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import DeductionsWorkspace from './deductions-workspace';

export default async function DeductionsPage() {
  const canView = await checkRouteAccess('/deductions');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'deductions.visited',
      entityType: 'Deduction',
      importance: 'low'
    });
  }

  return <DeductionsWorkspace />;
}
