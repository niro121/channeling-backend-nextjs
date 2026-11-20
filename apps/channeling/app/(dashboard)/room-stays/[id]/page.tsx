import { notFound, redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getStayDetail } from '@/services/room-checklist.service';
import { StayDetailView } from './stay-detail';

export const dynamic = 'force-dynamic';

export default async function RoomStayPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await checkRouteAccess('/room-stays'))) redirect('/unauthorized-access');
  const { id } = await params;
  const stay = await getStayDetail(id);
  if (!stay) notFound();
  return <StayDetailView stay={stay} />;
}
