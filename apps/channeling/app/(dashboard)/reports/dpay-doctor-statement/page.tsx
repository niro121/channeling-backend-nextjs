import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';
import DpayDoctorStatementReportContent from './dpay-doctor-statement-report-content';

export const dynamic = 'force-dynamic';

export default async function DpayDoctorStatementReportPage() {
  const canView = await checkRouteAccess('/reports/dpay-doctor-statement');
  if (!canView) redirect('/unauthorized-access');

  const [ref, session] = await Promise.all([
    getReportFilterOptions({ doctors: true }),
    fetchServerSession(),
  ]);

  const doctorOptions: Array<{ id: string; name: string }> = (
    ref.success && ref.doctorOptions ? ref.doctorOptions : []
  ).filter((option) => option.id !== '__all__');

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
    <DpayDoctorStatementReportContent
      currentUserName={currentUserName}
      doctorOptions={doctorOptions}
    />
  );
}
