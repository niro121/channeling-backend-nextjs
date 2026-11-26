import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getHrmVariableAction } from '@/app/actions/hr-admin-actions/hrm-variable.actions';
import { emptyHrmVariableRecord } from '@/types/hrm-variable';
import HrmVariableWorkspace from './hrm-variable-workspace';

export default async function HrmVariablesPage() {
  const canView = await checkRouteAccess('/hrm-variables');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'hrm-variables.visited',
      entityType: 'HrmVariable',
      importance: 'low'
    });
  }

  const result = await getHrmVariableAction();
  const initialRecord = result.isError
    ? emptyHrmVariableRecord()
    : (result.data ?? emptyHrmVariableRecord());

  return <HrmVariableWorkspace initialRecord={initialRecord} />;
}
