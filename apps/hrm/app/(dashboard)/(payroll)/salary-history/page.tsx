import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import SalaryHistoryWorkspace from './salary-history-workspace';

export default async function SalaryHistoryPage() {
  const canView = await checkRouteAccess('/salary-history');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'salary-history.visited',
      entityType: 'SalaryHistory',
      importance: 'low'
    });
  }

  return <SalaryHistoryWorkspace />;
}
