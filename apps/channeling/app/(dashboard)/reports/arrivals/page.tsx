import { INSTITUTION_OPTIONS } from '@/types/doctor.session';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import DoctorArrivalsReportContent from './doctor-arrivals-report-content';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';

export const dynamic = 'force-dynamic';

export default async function DoctorArrivalsReportPage() {
  const canView = await checkRouteAccess('/reports/arrivals');
  if (!canView) redirect('/unauthorized-access');

  const [session, ref, locRef, deptRef, specRef] = await Promise.all([
    fetchServerSession(),
    getReportFilterOptions({ doctors: true }),
    getReportFilterOptions({ locations: true }),
    getReportFilterOptions({ departments: true }),
    getReportFilterOptions({ specialities: true })
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

  const doctorOptions: Array<{ id: string; name: string }> =
    ref.success && ref.doctorOptions ? ref.doctorOptions : [{ id: '__all__', name: 'All Doctors' }];

  const locationOptions: Array<{ id: string; name: string }> =
    locRef.success && locRef.locationOptions
      ? locRef.locationOptions
      : [{ id: '__all__', name: 'All Branches' }];

  const departmentOptions: Array<{ id: string; name: string }> =
    deptRef.success && deptRef.departmentOptions
      ? deptRef.departmentOptions
      : [{ id: '__all__', name: 'All Departments' }];

  const specialityOptions: Array<{ id: string; name: string }> =
    specRef.success && specRef.specialityOptions
      ? specRef.specialityOptions
      : [{ id: '__all__', name: 'All Specialities' }];

  return (
    <DoctorArrivalsReportContent
      currentUserName={currentUserName}
      institutionOptions={[...INSTITUTION_OPTIONS]}
      locationOptions={locationOptions}
      departmentOptions={departmentOptions}
      specialityOptions={specialityOptions}
      doctorOptions={doctorOptions}
    />
  );
}
