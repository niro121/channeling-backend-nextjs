import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import PerformanceAllowanceWorkspace from './performance-allowance-workspace';

export default async function PerformanceAllowancePage() {
  const canView = await checkRouteAccess('/performance-allowance');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'performance-allowance.visited',
      entityType: 'PerformanceAllowance',
      importance: 'low'
    });
  }

  return <PerformanceAllowanceWorkspace />;
}
