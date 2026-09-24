import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { fetchServerSession } from '@/lib/session';
import { checkRouteAccess } from '@/lib/server-permissions';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import ChannelReportReceiptWiseContent from './channel-report-receipt-wise-content';

export const dynamic = 'force-dynamic';

export default async function ChannelReportReceiptWisePage() {
  const canView = await checkRouteAccess('/reports');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await fetchServerSession();
  const currentUser =
    session?.user?.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, name: true, staff: { select: { code: true } } },
        })
      : null;

  const currentUserName = formatUserDisplayName(
    currentUser?.name ?? session?.user?.name,
    currentUser?.id ?? session?.user?.id,
    currentUser?.staff?.code
  );

  return <ChannelReportReceiptWiseContent currentUserName={currentUserName} />;
}
