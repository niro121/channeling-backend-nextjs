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

  // Status options for filter
  const statusOptions = [
    { id: '__all__', name: 'All Status' },
    { id: '1', name: 'Active' },
    { id: '0', name: 'Inactive' }
  ];

  return (
    <AgentDetailReportContent
      initialStatusOptions={statusOptions}
    />
  );
}
