import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import BankTransferFileWorkspace from './bank-transfer-file-workspace';

export default async function BankTransferFilePage() {
  const canView = await checkRouteAccess('/bank-transfer-file');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'bank-transfer-file.visited',
      entityType: 'BankTransferBatch',
      importance: 'low'
    });
  }

  return <BankTransferFileWorkspace />;
}
