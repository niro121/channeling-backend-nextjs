import {
  getDoctorOptions,
  getLocationOptions,
} from '@/app/actions/doctor.sessions.action';
import { getAllSpecialityOptions } from '@/app/actions/doctor.actions';
import { formatDoctorName } from '@/lib/helpers/doctor-name.helper';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import DoctorAppointmentCountReportContent from './doctor-appointment-count-report-content';

export const dynamic = 'force-dynamic';

export default async function DoctorAppointmentCountReportPage() {
  const canView = await checkRouteAccess('/reports');
  if (!canView) redirect('/unauthorized-access');

  const [doctorsResult, locationsResult, specialityRes, session] = await Promise.all([
    getDoctorOptions(),
    getLocationOptions(),
    getAllSpecialityOptions(),
    fetchServerSession(),
  ]);

  const doctorOptions: Array<{ id: string; name: string }> =
    doctorsResult.success && doctorsResult.data
      ? [
          { id: '__all__', name: 'All Doctors' },
          ...doctorsResult.data
            .filter((d: any) => d.id)
            .map((d: any) => ({ id: d.id || '', name: formatDoctorName(d) })),
        ]
      : [{ id: '__all__', name: 'All Doctors' }];

  const locationOptions: Array<{ id: string; name: string }> =
    locationsResult.success && locationsResult.data
      ? [
          { id: '__all__', name: 'All Branches' },
          ...locationsResult.data.map((loc: any) => ({ id: loc.id || '', name: loc.name || '' })),
        ]
      : [{ id: '__all__', name: 'All Branches' }];

  const specialityOptions: Array<{ id: string; name: string }> =
    specialityRes.success && specialityRes.data
      ? [
          { id: '__all__', name: 'All Specialities' },
          ...specialityRes.data
            .map((s: any) => ({ id: s.id || '', name: s.name || '' }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        ]
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
