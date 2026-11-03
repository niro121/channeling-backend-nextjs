import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import ChannelAgentReferenceBookReportContent from './channel-agent-reference-book-content';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';
import { getReferenceData } from '@/app/actions/reference/get-reference-data.action';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';

// Force dynamic rendering to prevent prerendering during build
export const dynamic = 'force-dynamic';

export default async function ChannelAgentReferenceBookReportPage() {
  // Check if user can access reports
  const canView = await checkRouteAccess('/reports/channel-agent-reference-book');
  if (!canView) {
    redirect('/unauthorized-access');
  }
  // Fetch data on the server
  const [session, ref, usersRef] = await Promise.all([
    fetchServerSession(),
    getReportFilterOptions({ agencies: true, allLabels: { agencies: 'All Agency' } }),
    getReferenceData({ users: true }),
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
    ref.success && ref.agencyOptions ? ref.agencyOptions : [{ id: '__all__', name: 'All Agency' }];
  const userOptions: Array<{ id: string; name: string }> =
    usersRef.success && usersRef.users ? usersRef.users.map((u) => ({ id: u.id, name: u.name })) : [];

  return (
    <ChannelAgentReferenceBookReportContent
      currentUserName={currentUserName}
      initialAgencyOptions={agencyOptions}
      initialUserOptions={userOptions}
    />
  );
}
