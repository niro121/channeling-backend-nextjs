import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import SalaryProcessingWorkspace from './salary-processing-workspace';

export default async function SalaryProcessingPage() {
  const canView = await checkRouteAccess('/salary-processing');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'salary-processing.visited',
      entityType: 'SalaryProcessing',
      importance: 'low'
    });
  }

  return <SalaryProcessingWorkspace />;
}
