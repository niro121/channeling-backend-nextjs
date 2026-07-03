import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import AgencyStatementReportContent from './agency-statement-report-content';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';

export const dynamic = 'force-dynamic';

export default async function AgencyStatementReportPage() {
  const canView = await checkRouteAccess('/reports');
  if (!canView) redirect('/unauthorized-access');

  const [ref, session] = await Promise.all([
    getReportFilterOptions({ agencies: true }),
    fetchServerSession(),
  ]);
  const agentOptions: Array<{ id: string; name: string }> =
    ref.success && ref.agencyOptions
      ? ref.agencyOptions.slice(1)
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
