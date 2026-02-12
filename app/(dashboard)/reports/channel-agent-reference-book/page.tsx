import { getAllAgenciesOptions } from '@/app/actions/agency.actions';
import ChannelAgentReferenceBookReportContent from './channel-agent-reference-book-content';

export default async function ChannelAgentReferenceBookReportPage() {
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
