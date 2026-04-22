import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';
import WithholdingTaxReportContent from './withholding-tax-report-content';

export const dynamic = 'force-dynamic';

export default async function WithholdingTaxReportPage() {
  const canView = await checkRouteAccess('/reports/withholding-tax');
  if (!canView) redirect('/unauthorized-access');

  const [session, doctorRef, locationRef] = await Promise.all([
    fetchServerSession(),
    getReportFilterOptions({ doctors: true }),
    getReportFilterOptions({ locations: true })
  ]);

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
    doctorRef.success && doctorRef.doctorOptions ? doctorRef.doctorOptions : [{ id: '__all__', name: 'All Doctors' }];
  const locationOptions =
    locationRef.success && locationRef.locationOptions
      ? locationRef.locationOptions
      : [{ id: '__all__', name: 'All Branches' }];

  return (
    <WithholdingTaxReportContent
      currentUserName={currentUserName}
      doctorOptions={doctorOptions}
      locationOptions={locationOptions}
    />
  );
}
