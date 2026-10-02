import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';
import DoctorBalanceReportContent from './doctor-balance-report-content';

export const dynamic = 'force-dynamic';

export default async function DoctorBalanceReportPage() {
  const canView = await checkRouteAccess('/reports/doctor-balance');
  if (!canView) redirect('/unauthorized-access');

  const [ref, session] = await Promise.all([
    getReportFilterOptions({ doctors: true, specialities: true }),
    fetchServerSession(),
  ]);

  const doctorOptions: Array<{ id: string; name: string }> =
    ref.success && ref.doctorOptions ? ref.doctorOptions : [{ id: '__all__', name: 'All Doctors' }];

  const specialityOptions: Array<{ id: string; name: string }> =
    ref.success && ref.specialityOptions
      ? ref.specialityOptions
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
    <DoctorBalanceReportContent
      currentUserName={currentUserName}
      doctorOptions={doctorOptions}
      specialityOptions={specialityOptions}
    />
  );
}
