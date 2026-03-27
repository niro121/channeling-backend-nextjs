import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import ChannelAgentReceiptReportContent from './channel-agent-receipt-report-content';

export const dynamic = 'force-dynamic';

export default async function ChannelAgentReceiptReportPage() {
  const canView = await checkRouteAccess('/reports');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  return <ChannelAgentReceiptReportContent />;
}
