import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import ChannelAgentReferenceBookReportContent from './channel-agent-reference-book-content';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';
import { getReferenceData } from '@/app/actions/reference/get-reference-data.action';


// Force dynamic rendering to prevent prerendering during build
export const dynamic = 'force-dynamic';

export default async function ChannelAgentReferenceBookReportPage() {
  // Check if user can access reports
  const canView = await checkRouteAccess('/reports/channel-agent-reference-book');
  if (!canView) {
    redirect('/unauthorized-access');
  }
  // Fetch data on the server
  const [ref, usersRef] = await Promise.all([
    getReportFilterOptions({ agencies: true, allLabels: { agencies: 'All Agency' } }),
    getReferenceData({ users: true }),
  ]);
  const agencyOptions: Array<{ id: string; name: string }> =
    ref.success && ref.agencyOptions ? ref.agencyOptions : [{ id: '__all__', name: 'All Agency' }];
  const userOptions: Array<{ id: string; name: string }> =
    usersRef.success && usersRef.users ? usersRef.users.map((u) => ({ id: u.id, name: u.name })) : [];

  return (
    <ChannelAgentReferenceBookReportContent
      initialAgencyOptions={agencyOptions}
      initialUserOptions={userOptions}
    />
  );
}
