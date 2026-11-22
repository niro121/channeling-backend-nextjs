import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import { checkPermission, checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import prisma from '@/lib/prisma';
import { roomsForPrinting } from '@/services/room-ayu.service';
import { RoomQrSheet } from './room-qr-sheet';

export const dynamic = 'force-dynamic';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** Printable QR cards for in-room Ayu: one per room, filtered by branch or zone. Needs Rooms → View. */
export default async function RoomQrPage({
  searchParams,
}: {
  searchParams?: Promise<{ locationId?: string; zoneId?: string; roomId?: string }>;
}) {
  if (!(await checkRouteAccess('/rooms'))) redirect('/unauthorized-access');
  const session = await fetchServerSession();
  const p = (await searchParams) ?? {};
  const [locations, zones] = await Promise.all([
    prisma.location.findMany({ where: { status: 1, rooms: { some: {} } }, select: { id: true, name: true }, orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
    prisma.zone.findMany({ select: { id: true, name: true, locationId: true }, orderBy: { name: 'asc' } }),
  ]);
  const locationId = p.locationId && OBJECT_ID.test(p.locationId) ? p.locationId : p.roomId ? null : locations[0]?.id ?? null;
  const zoneId = p.zoneId && OBJECT_ID.test(p.zoneId) ? p.zoneId : null;
  const rooms = await roomsForPrinting(
    { locationId, zoneId, roomIds: p.roomId && OBJECT_ID.test(p.roomId) ? [p.roomId] : undefined },
    session!.user!.id!
  );
  logActivityNonBlocking({ userId: session!.user!.id!, action: 'roomAyu.qrPrinted', entityType: 'Room', importance: 'low', metadata: { locationId, zoneId, count: rooms.length } });

  return (
    <RoomQrSheet
      rooms={rooms}
      baseUrl={(process.env.AYU_ROOM_PUBLIC_URL?.trim() || 'https://ai.ruhunuhospital.lk').replace(/\/+$/, '')}
      locations={locations}
      zones={zones.filter((z) => !locationId || z.locationId === locationId)}
      locationId={locationId}
      zoneId={zoneId}
      canReissue={await checkPermission('rooms', 'edit')}
    />
  );
}
