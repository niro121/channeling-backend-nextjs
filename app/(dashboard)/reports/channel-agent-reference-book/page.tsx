import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import ChannelAgentReferenceBookReportContent from './channel-agent-reference-book-content';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';


// Force dynamic rendering to prevent prerendering during build
export const dynamic = 'force-dynamic';

export default async function ChannelAgentReferenceBookReportPage() {
  // Check if user can access reports
  const canView = await checkRouteAccess('/reports/channel-agent-reference-book');
  if (!canView) {
    redirect('/unauthorized-access');
  }
  // Fetch data on the server
  const ref = await getReportFilterOptions({ agencies: true, allLabels: { agencies: 'All Agency' } });
  const agencyOptions: Array<{ id: string; name: string }> =
    ref.success && ref.agencyOptions ? ref.agencyOptions : [{ id: '__all__', name: 'All Agency' }];

  return (
    <ChannelAgentReferenceBookReportContent
      initialAgencyOptions={agencyOptions}
    />
  );
}
