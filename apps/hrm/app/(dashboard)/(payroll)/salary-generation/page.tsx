import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import SalaryGenerationWorkspace from './salary-generation-workspace';

export default async function SalaryGenerationPage() {
  const canView = await checkRouteAccess('/salary-generation');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'salary-generation.visited',
      entityType: 'SalaryGeneration',
      importance: 'low'
    });
  }

  return <SalaryGenerationWorkspace />;
}
