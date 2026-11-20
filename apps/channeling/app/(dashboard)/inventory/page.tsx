import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import { checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  listInventoryCategories,
  listInventoryItems,
  listInventoryOptions,
  listInventoryUnits,
} from '@/services/inventory.service';
import { InventoryManager } from './inventory-manager';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  if (!(await checkRouteAccess('/inventory'))) redirect('/unauthorized-access');

  const session = await fetchServerSession();
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'inventory.visited',
      entityType: 'Inventory',
      importance: 'low',
    });
  }

  const [items, units, categories, options] = await Promise.all([
    listInventoryItems(),
    listInventoryUnits(),
    listInventoryCategories(),
    listInventoryOptions(),
  ]);

  return (
    <InventoryManager
      items={items}
      units={units}
      categories={categories}
      locations={options.locations}
    />
  );
}
