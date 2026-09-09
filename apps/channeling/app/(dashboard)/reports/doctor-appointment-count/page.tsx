import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import DoctorAppointmentCountReportContent from './doctor-appointment-count-report-content';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';

export const dynamic = 'force-dynamic';

export default async function DoctorAppointmentCountReportPage() {
  const canView = await checkRouteAccess('/reports');
  if (!canView) redirect('/unauthorized-access');

  const [ref, locRef, specialityRef, session] = await Promise.all([
    getReportFilterOptions({ doctors: true }),
    getReportFilterOptions({ locations: true }),
    getReportFilterOptions({ specialities: true }),
    fetchServerSession(),
  ]);

  const doctorOptions: Array<{ id: string; name: string }> =
    ref.success && ref.doctorOptions ? ref.doctorOptions : [{ id: '__all__', name: 'All Doctors' }];

  const locationOptions: Array<{ id: string; name: string }> =
    locRef.success && locRef.locationOptions
      ? locRef.locationOptions
      : [{ id: '__all__', name: 'All Branches' }];

  const specialityOptions: Array<{ id: string; name: string }> =
    specialityRef.success && specialityRef.specialityOptions
      ? specialityRef.specialityOptions
      : [{ id: '__all__', name: 'All Specialities' }];

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
    <DoctorAppointmentCountReportContent
      locationOptions={locationOptions}
      specialityOptions={specialityOptions}
      doctorOptions={doctorOptions}
      currentUserName={currentUserName}
    />
  );
}
