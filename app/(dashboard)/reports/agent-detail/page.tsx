import { getAllAgenciesOptions } from '@/app/actions/agency.actions';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import AgentDetailReportContent from './agent-detail-content';

// Force dynamic rendering to prevent prerendering during build
export const dynamic = 'force-dynamic';

export default async function AgentDetailReportPage() {
  // Check if user can access reports
  const canView = await checkRouteAccess('/reports/agent-detail');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const agenciesResult = await getAllAgenciesOptions();
  const agencyOptions: Array<{ id: string; name: string }> =
    agenciesResult.success && agenciesResult.data
      ? [
          { id: '__all__', name: 'All Agency' },
          ...agenciesResult.data
            .filter((agency: any) => agency.id)
            .map((agency: any) => {
              const agencyName = agency.name || '';
              const agencyCode = agency.code ? `(${agency.code})` : '';
              const formattedName = agencyCode
                ? `${agencyName} ${agencyCode}`
                : agencyName;
              return {
                id: agency.id || '',
                name: formattedName
              };
            })
        ]
      : [{ id: '__all__', name: 'All Agency' }];

  // Status options for filter
  const statusOptions = [
    { id: '__all__', name: 'All Status' },
    { id: '1', name: 'Active' },
    { id: '0', name: 'Inactive' }
  ];

  return (
    <AgentDetailReportContent
      initialAgencyOptions={agencyOptions}
      initialStatusOptions={statusOptions}
    />
  );
}
