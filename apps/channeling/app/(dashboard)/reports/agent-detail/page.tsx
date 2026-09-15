import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import AgentDetailReportContent from './agent-detail-content';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';

// Force dynamic rendering to prevent prerendering during build
export const dynamic = 'force-dynamic';

export default async function AgentDetailReportPage() {
  // Check if user can access reports
  const canView = await checkRouteAccess('/reports/agent-detail');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const ref = await getReportFilterOptions({ agencies: true, allLabels: { agencies: 'All Agency' } });
  const agencyOptions: Array<{ id: string; name: string }> =
    ref.success && ref.agencyOptions ? ref.agencyOptions : [{ id: '__all__', name: 'All Agency' }];

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
