import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { getReportUserOptionsAction } from '@/app/actions/reports/user-activity.action';
import { getLocationOptions } from '@/app/actions/doctor.sessions.action';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import AllCashierSummaryDetailContent from './all-cashier-summary-detail-content';

export const dynamic = 'force-dynamic';

export default async function AllCashierSummaryDetailReportPage() {
  const canView = await checkRouteAccess('/reports');
  if (!canView) redirect('/unauthorized-access');

  const [userOptionsRes, locationOptionsRes, session] = await Promise.all([
    getReportUserOptionsAction(),
    getLocationOptions(),
    fetchServerSession(),
  ]);

  const initialUserOptions = userOptionsRes.success && userOptionsRes.data ? userOptionsRes.data : [];
  const locationOptions =
    locationOptionsRes.success && locationOptionsRes.data
      ? [{ id: '__all__', name: 'All Branches' }, ...locationOptionsRes.data.map((loc: any) => ({ id: loc.id || '', name: loc.name || '' }))]
      : [{ id: '__all__', name: 'All Branches' }];
  const currentUser =
    session?.user?.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, name: true, staff: { select: { code: true } } },
        })
      : null;
  const currentUserName = formatUserDisplayName(currentUser?.name ?? session?.user?.name, currentUser?.id ?? session?.user?.id, currentUser?.staff?.code);

  return (
    <AllCashierSummaryDetailContent
      initialUserOptions={initialUserOptions}
      initialLocationOptions={locationOptions}
      currentUserName={currentUserName}
    />
  );
}
