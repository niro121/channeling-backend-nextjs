import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getSalaryCycleOptionsAction } from '@/app/actions/hr-admin-actions/salary-cycle.actions';
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

  const optionsRes = await getSalaryCycleOptionsAction();
  const cycleOptions = optionsRes.isError ? [] : (optionsRes.data ?? []);

  return <SalaryGenerationWorkspace cycleOptions={cycleOptions} />;
}
