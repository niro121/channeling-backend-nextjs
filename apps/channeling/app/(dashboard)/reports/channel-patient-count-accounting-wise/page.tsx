import { getLocationOptions } from '@/app/actions/doctor.sessions.action';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import ChannelPatientCountAccountingWiseReportContent from './channel-patient-count-accounting-wise-report-content';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';

export const dynamic = 'force-dynamic';

export default async function ChannelPatientCountAccountingWiseReportPage() {
  const canView = await checkRouteAccess('/reports');
  if (!canView) redirect('/unauthorized-access');

  const [ref, session] = await Promise.all([
    getReportFilterOptions({ locations: true }),
    fetchServerSession(),
  ]);

  const locationOptions: Array<{ id: string; name: string }> =
    ref.success && ref.locationOptions
      ? ref.locationOptions
      : [{ id: '__all__', name: 'All Branches' }];

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

  return (
    <ChannelPatientCountAccountingWiseReportContent
      locationOptions={locationOptions}
      currentUserName={currentUserName}
    />
  );
}

