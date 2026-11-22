import { staysGate } from '../gate';
import { ChecklistFlow } from '../checklist-flow';

export const dynamic = 'force-dynamic';

export default async function CheckInPage({ searchParams }: { searchParams: Promise<{ roomId?: string }> }) {
  const blocked = await staysGate((f) => f.checkIn);
  if (blocked) return blocked;
  const { roomId } = await searchParams;
  return <ChecklistFlow kind="check_in" roomId={roomId ?? ''} />;
}
