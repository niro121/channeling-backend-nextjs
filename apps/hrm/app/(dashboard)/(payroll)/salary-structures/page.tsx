import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import SalaryStructuresWorkspace from './salary-structures-workspace';

export default async function SalaryStructuresPage() {
  const canView = await checkRouteAccess('/salary-structures');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'salary-structures.visited',
      entityType: 'SalaryStructure',
      importance: 'low'
    });
  }

  return <SalaryStructuresWorkspace />;
}
