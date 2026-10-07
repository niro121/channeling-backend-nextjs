import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';
import ChannelAgentReceiptReportContent from './channel-agent-receipt-report-content';

export const dynamic = 'force-dynamic';

export default async function ChannelAgentReceiptReportPage() {
  const canView = await checkRouteAccess('/reports');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const [session, ref] = await Promise.all([
    fetchServerSession(),
    getReportFilterOptions({ agencies: true, allLabels: { agencies: 'All Agencies' } }),
  ]);

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

  const agencyOptions: Array<{ id: string; name: string }> =
    ref.success && ref.agencyOptions
      ? ref.agencyOptions
      : [{ id: '__all__', name: 'All Agencies' }];

  return (
    <ChannelAgentReceiptReportContent
      currentUserName={currentUserName}
      agencyOptions={agencyOptions}
    />
  );
}
