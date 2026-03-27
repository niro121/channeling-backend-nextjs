import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { getAllAgenciesOptions } from '@/app/actions/agency.actions';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import AgencyStatementReportContent from './agency-statement-report-content';

export const dynamic = 'force-dynamic';

export default async function AgencyStatementReportPage() {
  const canView = await checkRouteAccess('/reports');
  if (!canView) redirect('/unauthorized-access');

  const [agenciesRes, session] = await Promise.all([getAllAgenciesOptions(), fetchServerSession()]);
  const agentOptions: Array<{ id: string; name: string }> =
    agenciesRes.success && agenciesRes.data
      ? agenciesRes.data.map((a: any) => ({ id: a.id || '', name: a.code && a.name ? `${a.name} (${a.code})` : a.name || '' }))
      : [];

  const currentUser =
    session?.user?.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, name: true, staff: { select: { code: true } } },
        })
      : null;
  const currentUserName = formatUserDisplayName(currentUser?.name ?? session?.user?.name, currentUser?.id ?? session?.user?.id, currentUser?.staff?.code);

  return <AgencyStatementReportContent agentOptions={agentOptions} currentUserName={currentUserName} />;
}
