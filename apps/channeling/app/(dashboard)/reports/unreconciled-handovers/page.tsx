import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getReportUserOptionsAction } from '@/app/actions/reports/user-activity.action';
import UnreconciledHandoversReportContent from './unreconciled-handovers-report-content';

export const dynamic = 'force-dynamic';

export default async function UnreconciledHandoversReportPage() {
  const canView = await checkRouteAccess('/reports/unreconciled-handovers');
  if (!canView) redirect('/unauthorized-access');

  const session = await fetchServerSession();

  const [currentUser, usersRes] = await Promise.all([
    session?.user?.id
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, name: true, staff: { select: { code: true } } },
        })
      : Promise.resolve(null),
    getReportUserOptionsAction(),
  ]);

  const currentUserName = formatUserDisplayName(
    currentUser?.name ?? session?.user?.name,
    currentUser?.id ?? session?.user?.id,
    currentUser?.staff?.code
  );

  const userOptions = usersRes.success && usersRes.data ? usersRes.data : [];

  return (
    <UnreconciledHandoversReportContent
      currentUserName={currentUserName}
      userOptions={userOptions}
    />
  );
}
