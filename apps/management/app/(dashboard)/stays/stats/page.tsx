import { staysGate } from '../gate';
import { StatsView } from './stats-view';
import { getStayRoomsAction } from '@/app/actions/room-stays.actions';

export const dynamic = 'force-dynamic';

export default async function StayStatsPage({ searchParams }: { searchParams: Promise<{ locationId?: string }> }) {
  const blocked = await staysGate();
  if (blocked) return blocked;
  const { locationId } = await searchParams;
  // Branch name for the header; the stats themselves load on the client.
  const rooms = await getStayRoomsAction(locationId ?? null);
  const resolved = rooms.success ? rooms.data.locationId : locationId ?? null;
  const branchName = rooms.success ? rooms.data.locations.find((l) => l.id === resolved)?.name ?? null : null;
  return <StatsView locationId={resolved} branchName={branchName} />;
}
