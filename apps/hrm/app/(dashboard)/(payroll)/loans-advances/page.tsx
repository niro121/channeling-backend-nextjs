import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getPaysheetComponentOptionsAction } from '@/app/actions/hr-admin-actions/paysheet-component.actions';
import LoansAdvancesWorkspace from './loans-advances-workspace';

export default async function LoansAdvancesPage() {
  const canView = await checkRouteAccess('/loans-advances');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'loans-advances.visited',
      entityType: 'LoanAdvance',
      importance: 'low'
    });
  }

  const optionsRes = await getPaysheetComponentOptionsAction({
    typeIds: ['loan', 'advance']
  });
  const componentOptions = optionsRes.isError ? [] : (optionsRes.data ?? []);

  return <LoansAdvancesWorkspace componentOptions={componentOptions} />;
}
