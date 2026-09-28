import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getPaysheetComponentOptionsAction } from '@/app/actions/hr-admin-actions/paysheet-component.actions';
import AssignPaysheetWorkspace from './assign-paysheet-workspace';

export default async function AssignPaysheetComponentPage() {
  const canView = await checkRouteAccess('/assign-paysheet-component');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'assign-paysheet-component.visited',
      entityType: 'PaysheetAssignment',
      importance: 'low'
    });
  }

  const optionsRes = await getPaysheetComponentOptionsAction();
  const componentOptions = optionsRes.isError ? [] : (optionsRes.data ?? []);

  return <AssignPaysheetWorkspace componentOptions={componentOptions} />;
}
