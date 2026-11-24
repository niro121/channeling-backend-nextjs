import { staysGate } from '../gate';
import { StayView } from './stay-view';

export const dynamic = 'force-dynamic';

export default async function StayPage({ params }: { params: Promise<{ id: string }> }) {
  const blocked = await staysGate();
  if (blocked) return blocked;
  const { id } = await params;
  return <StayView stayId={id} />;
}
