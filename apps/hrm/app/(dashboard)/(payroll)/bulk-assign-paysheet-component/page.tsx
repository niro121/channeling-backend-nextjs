import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getPaysheetComponentOptionsAction } from '@/app/actions/hr-admin-actions/paysheet-component.actions';
import BulkAssignWorkspace from './bulk-assign-workspace';

export default async function BulkAssignPaysheetComponentPage() {
  const canView = await checkRouteAccess('/bulk-assign-paysheet-component');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'bulk-assign-paysheet-component.visited',
      entityType: 'PaysheetAssignment',
      importance: 'low'
    });
  }

  const optionsRes = await getPaysheetComponentOptionsAction();
  const componentOptions = optionsRes.isError ? [] : (optionsRes.data ?? []);

  return <BulkAssignWorkspace componentOptions={componentOptions} />;
}
