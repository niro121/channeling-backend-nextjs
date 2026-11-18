import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import { checkPermission, checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  listInventoryOptions,
  listInventoryRooms,
  listInventoryUnits,
} from '@/services/inventory.service';
import { RoomInventoryBoard } from './room-inventory-board';

export const dynamic = 'force-dynamic';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

export default async function RoomInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ locationId?: string; groupBy?: string; roomId?: string }>;
}) {
  if (!(await checkRouteAccess('/room-inventory'))) redirect('/unauthorized-access');

  const session = await fetchServerSession();
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'roomInventory.visited',
      entityType: 'RoomInventory',
      importance: 'low',
    });
  }

  const params = (await searchParams) ?? {};
  const options = await listInventoryOptions();
  const groupBy = params.groupBy === 'department' ? 'department' : 'zone';
  const focusRoomId = params.roomId && OBJECT_ID.test(params.roomId) ? params.roomId : null;

  // ?locationId=all shows every branch; otherwise default to the first branch.
  let locationId: string | null =
    params.locationId && OBJECT_ID.test(params.locationId) ? params.locationId : null;
  if (!locationId && params.locationId !== 'all' && !focusRoomId) {
    locationId = options.locations[0]?.id ?? null;
  }

  const [rooms, units, canAssign, canEditUnits, canManage] = await Promise.all([
    listInventoryRooms(locationId),
    listInventoryUnits(locationId ? { locationId } : undefined),
    checkPermission('room-inventory', 'assign'),
    checkPermission('inventory', 'edit'),
    checkRouteAccess('/inventory'),
  ]);

  return (
    <RoomInventoryBoard
      key={`${locationId ?? 'all'}:${groupBy}`}
      rooms={rooms}
      units={units}
      locations={options.locations}
      zones={options.zones}
      departments={options.departments}
      locationId={locationId}
      groupBy={groupBy}
      canAssign={canAssign}
      canEditUnits={canEditUnits}
      canManage={canManage}
      focusRoomId={focusRoomId}
    />
  );
}
