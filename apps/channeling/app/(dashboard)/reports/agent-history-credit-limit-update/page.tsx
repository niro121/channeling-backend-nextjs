import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import AgentHistoryCreditLimitUpdateReportContent from './agent-history-credit-limit-update-report-content';
import { getReportUserOptionsAction } from '@/app/actions/reports/user-activity.action';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';

export const dynamic = 'force-dynamic';

export default async function AgentHistoryCreditLimitUpdateReportPage() {
  const canView = await checkRouteAccess('/reports/agent-history-credit-limit-update');
  if (!canView) redirect('/unauthorized-access');

  const [agenciesRes, usersRes, session] = await Promise.all([
    getReportFilterOptions({ agencies: true }),
    getReportUserOptionsAction(),
    fetchServerSession(),
  ]);

  const agentOptions: Array<{ id: string; name: string }> =
    agenciesRes.success && agenciesRes.agencyOptions
      ? agenciesRes.agencyOptions.slice(1)
      : [];

  const userOptions =
    usersRes.success && usersRes.data ? usersRes.data : [];

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

  return (
    <AgentHistoryCreditLimitUpdateReportContent
      agentOptions={agentOptions}
      userOptions={userOptions}
      currentUserName={currentUserName}
    />
  );
}

