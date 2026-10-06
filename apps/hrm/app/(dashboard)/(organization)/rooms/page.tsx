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
import { ROOM_STATUS_OPTIONS } from '@/types/room';
import RoomWorkspace from './room-workspace';
import type { RoomListFilters } from './section-room-filters';

type SearchParams = {
  searchParams?: Promise<{
    id?: string;
    search?: string;
    locationId?: string;
    zoneId?: string;
    status?: string;
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
  const locationIds = new Set(locationOptions.map((loc) => loc.id));
  const zoneIds = new Set(zoneOptions.map((zone) => zone.id));
  const statusIds = new Set(ROOM_STATUS_OPTIONS.map((opt) => opt.id as string));

  const locationId =
    params?.locationId && locationIds.has(params.locationId)
      ? params.locationId
      : undefined;
  const zoneId =
    params?.zoneId &&
    zoneIds.has(params.zoneId) &&
    (!locationId ||
      zoneOptions.some(
        (zone) => zone.id === params.zoneId && zone.locationId === locationId
      ))
      ? params.zoneId
      : undefined;

  const initialFilters: RoomListFilters = {
    search: params?.search?.trim() || undefined,
    locationId,
    zoneId,
    status:
      params?.status && statusIds.has(params.status) ? params.status : undefined
  };

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
      initialFilters={initialFilters}
    />
  );
}
