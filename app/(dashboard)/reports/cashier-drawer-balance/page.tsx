import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import CashierDrawerBalanceReportContent from './cashier-drawer-balance-report-content';

export const dynamic = 'force-dynamic';

export default async function CashierDrawerBalanceReportPage() {
  const canView = await checkRouteAccess('/reports/cashier-drawer-balance');
  if (!canView) redirect('/unauthorized-access');

  const session = await fetchServerSession();
  const currentUser =
    session?.user?.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, name: true, staff: { select: { code: true } } }
        })
      : null;
  const currentUserName = formatUserDisplayName(
    currentUser?.name ?? session?.user?.name,
    currentUser?.id ?? session?.user?.id,
    currentUser?.staff?.code
  );

  return <CashierDrawerBalanceReportContent currentUserName={currentUserName} />;
}

