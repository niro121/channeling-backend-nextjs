import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { fetchServerSession } from '@/lib/session';
import { checkRouteAccess } from '@/lib/server-permissions';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';
import ChannelDiscountReportContent from './channel-discount-report-content';

export const dynamic = 'force-dynamic';

export default async function ChannelDiscountReportPage() {
  const canView = await checkRouteAccess('/reports');
  if (!canView) redirect('/unauthorized-access');

  const [session, ref] = await Promise.all([fetchServerSession(), getReportFilterOptions({ doctors: true, locations: true })]);

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

  const doctorOptions =
    ref.success && ref.doctorOptions ? ref.doctorOptions : [{ id: '__all__', name: 'All Doctors' }];
  const locationOptions =
    ref.success && ref.locationOptions ? ref.locationOptions : [{ id: '__all__', name: 'All Branches' }];

  return (
    <ChannelDiscountReportContent
      currentUserName={currentUserName}
      doctorOptions={doctorOptions}
      locationOptions={locationOptions}
    />
  );
}
