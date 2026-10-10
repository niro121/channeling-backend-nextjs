import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';
import DailyReturnsSummaryReportContent from './daily-returns-summary-report-content';

export const dynamic = 'force-dynamic';

export default async function DailyReturnsSummaryReportPage() {
  const canView = await checkRouteAccess('/reports/daily-returns-summary');
  if (!canView) redirect('/unauthorized-access');

  const [session, ref] = await Promise.all([
    fetchServerSession(),
    getReportFilterOptions({ locations: true }),
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

  const locationOptions =
    ref.success && ref.locationOptions
      ? ref.locationOptions
      : [{ id: '__all__', name: 'All Branches' }];

  return (
    <DailyReturnsSummaryReportContent
      currentUserName={currentUserName}
      locationOptions={locationOptions}
    />
  );
}
