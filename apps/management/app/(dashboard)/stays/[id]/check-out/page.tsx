import { staysGate } from '../../gate';
import { ChecklistFlow } from '../../checklist-flow';

export const dynamic = 'force-dynamic';

export default async function CheckOutPage({ params }: { params: Promise<{ id: string }> }) {
  const blocked = await staysGate((f) => f.checkOut);
  if (blocked) return blocked;
  const { id } = await params;
  return <ChecklistFlow kind="check_out" stayId={id} />;
}
