import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getReportUserOptionsAction } from '@/app/actions/reports/user-activity.action';
import BankDepositsReportContent from './bank-deposits-report-content';

export const dynamic = 'force-dynamic';

export default async function BankDepositsReportPage() {
  const canView = await checkRouteAccess('/reports/bank-deposits');
  if (!canView) redirect('/unauthorized-access');

  const session = await fetchServerSession();

  const [currentUser, bankAccounts, usersRes] = await Promise.all([
    session?.user?.id
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, name: true, staff: { select: { code: true } } },
        })
      : Promise.resolve(null),
    prisma.bankAccount.findMany({
      where: { status: 1 },
      select: {
        id: true,
        name: true,
        accountNumber: true,
        bank: { select: { name: true } },
      },
      orderBy: [{ name: 'asc' }, { accountNumber: 'asc' }],
    }),
    getReportUserOptionsAction(),
  ]);

  const currentUserName = formatUserDisplayName(
    currentUser?.name ?? session?.user?.name,
    currentUser?.id ?? session?.user?.id,
    currentUser?.staff?.code
  );

  const bankAccountOptions: Array<{ id: string; name: string }> = [
    { id: '__all__', name: 'All Bank Accounts' },
    ...bankAccounts.map((b) => ({
      id: b.id,
      name: `${b.name} - ${b.accountNumber}${b.bank?.name ? ` (${b.bank.name})` : ''}`,
    })),
  ];

  const userOptions = usersRes.success && usersRes.data ? usersRes.data : [];

  return (
    <BankDepositsReportContent
      currentUserName={currentUserName}
      bankAccountOptions={bankAccountOptions}
      userOptions={userOptions}
    />
  );
}

