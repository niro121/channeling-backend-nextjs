import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getReportUserOptionsAction } from '@/app/actions/reports/user-activity.action';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';
import { isBranchReconciledCashAccount } from '@/services/accounting/account/branch-reconciled-account.constants';
import CashVouchersReportContent from './cash-vouchers-report-content';

export const dynamic = 'force-dynamic';

export default async function CashVouchersReportPage() {
  const canView = await checkRouteAccess('/reports/cash-vouchers');
  if (!canView) redirect('/unauthorized-access');

  const session = await fetchServerSession();
  const [currentUser, accounts, usersRes, locRef] = await Promise.all([
    session?.user?.id
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, name: true, staff: { select: { code: true } } },
        })
      : Promise.resolve(null),
    prisma.account.findMany({
      where: { type: 'CASH', isActive: true, userId: null },
      select: { id: true, name: true, code: true, userId: true, location: { select: { name: true } } },
      orderBy: { name: 'asc' },
    }),
    getReportUserOptionsAction(),
    getReportFilterOptions({ locations: true }),
  ]);

  const currentUserName = formatUserDisplayName(
    currentUser?.name ?? session?.user?.name,
    currentUser?.id ?? session?.user?.id,
    currentUser?.staff?.code
  );

  const accountOptions = [
    { id: '__all__', name: 'All reconciliation accounts' },
    ...accounts.filter((account) => isBranchReconciledCashAccount(account)).map((account) => ({
      id: account.id,
      name: `${account.location?.name ? `${account.location.name} — ` : ''}${account.name}`,
    })),
  ];

  const userOptions = usersRes.success && usersRes.data ? usersRes.data : [];
  const locationOptions =
    locRef.success && locRef.locationOptions?.length
      ? locRef.locationOptions
      : [{ id: '__all__', name: 'All Branches' }];

  return (
    <CashVouchersReportContent
      currentUserName={currentUserName}
      accountOptions={accountOptions}
      userOptions={userOptions}
      locationOptions={locationOptions}
    />
  );
}
