import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import AllowancesWorkspace from './allowances-workspace';

export default async function AllowancesPage() {
  const canView = await checkRouteAccess('/allowances');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'allowances.visited',
      entityType: 'Allowance',
      importance: 'low'
    });
  }

  return <AllowancesWorkspace />;
}
