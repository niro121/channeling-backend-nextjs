import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import AgentDetailReportContent from './agent-detail-content';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';

// Force dynamic rendering to prevent prerendering during build
export const dynamic = 'force-dynamic';

export default async function AgentDetailReportPage() {
  const canView = await checkRouteAccess('/reports/agent-detail');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const [session, ref] = await Promise.all([
    fetchServerSession(),
    getReportFilterOptions({ agencies: true, allLabels: { agencies: 'All Agency' } }),
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
      : [{ id: '__all__', name: 'All Agency' }];

  const statusOptions = [
    { id: '__all__', name: 'All Status' },
    { id: '1', name: 'Active' },
    { id: '0', name: 'Inactive' },
  ];

  return (
    <AgentDetailReportContent
      currentUserName={currentUserName}
      initialAgencyOptions={agencyOptions}
      initialStatusOptions={statusOptions}
    />
  );
}
