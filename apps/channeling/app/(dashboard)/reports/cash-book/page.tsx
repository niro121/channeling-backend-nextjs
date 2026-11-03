import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import CashBookReportContent from './cash-book-report-content';

export const dynamic = 'force-dynamic';

export default async function CashBookReportPage() {
  const canView = await checkRouteAccess('/reports/cash-book');
  if (!canView) redirect('/unauthorized-access');

  const [session, cashBooks] = await Promise.all([
    fetchServerSession(),
    prisma.account.findMany({
      where: { type: 'CASH', isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: [{ name: 'asc' }],
    }),
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

  const cashBookOptions = cashBooks.map((account) => ({
    id: account.id,
    name: account.code ? `${account.name ?? '-'} (${account.code})` : (account.name ?? '-'),
  }));

  return <CashBookReportContent currentUserName={currentUserName} cashBookOptions={cashBookOptions} />;
}
