import { getAllAgenciesOptions } from '@/app/actions/agency.actions';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import ChannelAgentReferenceBookReportContent from './channel-agent-reference-book-content';


// Force dynamic rendering to prevent prerendering during build
export const dynamic = 'force-dynamic';

export default async function ChannelAgentReferenceBookReportPage() {
  // Check if user can access reports
  const canView = await checkRouteAccess('/reports/channel-agent-reference-book');
  if (!canView) {
    redirect('/unauthorized-access');
  }
  // Fetch data on the server
  const agenciesResult = await getAllAgenciesOptions();

  // Format agency options with code
  const agencyOptions: Array<{ id: string; name: string }> = agenciesResult.success && agenciesResult.data
    ? [
        { id: '__all__', name: 'All Agency' },
        ...agenciesResult.data
          .filter((agency: any) => agency.id)
          .map((agency: any) => {
            const agencyName = agency.name || '';
            const agencyCode = agency.code ? `(${agency.code})` : '';
            const formattedName = agencyCode ? `${agencyName} ${agencyCode}` : agencyName;
            return {
              id: agency.id || '',
              name: formattedName
            };
          })
      ]
    : [{ id: '__all__', name: 'All Agency' }];

  return (
    <ChannelAgentReferenceBookReportContent
      initialAgencyOptions={agencyOptions}
    />
  );
}
