import { checkRouteAccess } from '@/lib/server-permissions';
import { logActivity } from '@/lib/activity-log';
import { fetchServerSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { BulkCashierContent } from './bulk-cashier-content';

export default async function BulkCashierPage() {
  const canView = await checkRouteAccess('/bulk-cashier');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await fetchServerSession();
  const bulkCashierId = session?.user?.id;
  if (!bulkCashierId) {
    redirect('/unauthorized-access');
  }
  await logActivity({
    userId: bulkCashierId,
    action: 'bulk-cashier.visited',
    entityType: 'BulkCashier',
    importance: 'low',
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Bulk Cashier</h2>
        <p className="text-muted-foreground">
          Review and approve float requests from cashiers.
        </p>
      </div>
      <BulkCashierContent bulkCashierId={bulkCashierId} />
    </div>
  );
}
