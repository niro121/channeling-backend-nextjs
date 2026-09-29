import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import PayslipsWorkspace from './payslips-workspace';

export default async function PayslipsPage() {
  const canView = await checkRouteAccess('/payslips');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'payslips.visited',
      entityType: 'Payslip',
      importance: 'low'
    });
  }

  return <PayslipsWorkspace />;
}
