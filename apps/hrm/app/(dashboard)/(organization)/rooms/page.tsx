import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import {
  getLinkedLocationOptionsForRoomsAction,
  getLinkedZoneOptionsForRoomsAction,
  getRoomListAction
} from '@/app/actions/organization-actions/room.actions';
import RoomWorkspace from './room-workspace';

type SearchParams = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function RoomsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/rooms');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'organizations.rooms.visited',
      entityType: 'Room',
      importance: 'low'
    });
  }

  const [listRes, locationsRes, zonesRes] = await Promise.all([
    getRoomListAction(),
    getLinkedLocationOptionsForRoomsAction(),
    getLinkedZoneOptionsForRoomsAction()
  ]);
  const records = listRes.isError ? [] : (listRes.data ?? []);
  const locationOptions = locationsRes.isError
    ? []
    : (locationsRes.data ?? []);
  const zoneOptions = zonesRes.isError ? [] : (zonesRes.data ?? []);

  const params = await searchParams;
  const defaultSelected =
    params?.id && records.some((r) => r.id === params.id)
      ? params.id
      : (records[0]?.id ?? null);

  return (
    <RoomWorkspace
      initialRecords={records}
      locationOptions={locationOptions}
      zoneOptions={zoneOptions}
      initialSelectedId={defaultSelected}
    />
  );
}
