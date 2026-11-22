import { staysGate } from './gate';
import { StaysContent } from './stays-content';

export const dynamic = 'force-dynamic';

export default async function StaysPage({ searchParams }: { searchParams: Promise<{ locationId?: string }> }) {
  const blocked = await staysGate();
  if (blocked) return blocked;
  const { locationId } = await searchParams;
  return <StaysContent initialLocationId={locationId ?? null} />;
}
