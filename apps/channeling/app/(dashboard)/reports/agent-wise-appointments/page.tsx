import { INSTITUTION_OPTIONS } from '@/types/doctor.session';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';
import AgentWiseAppointmentsReportContent from '@/app/(dashboard)/reports/agent-wise-appointments/agent-wise-appointments-report-content';

export const dynamic = 'force-dynamic';

export default async function AgentWiseAppointmentsReportPage() {
  const canView = await checkRouteAccess('/reports/agent-wise-appointments');
  if (!canView) redirect('/unauthorized-access');

  const [session, locRef, deptRef, agencyRef] = await Promise.all([
    fetchServerSession(),
    getReportFilterOptions({ locations: true }),
    getReportFilterOptions({ departments: true }),
    getReportFilterOptions({ agencies: true }),
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

  const locationOptions: Array<{ id: string; name: string }> =
    locRef.success && locRef.locationOptions ? locRef.locationOptions : [{ id: '__all__', name: 'All Branches' }];

  const departmentOptions: Array<{ id: string; name: string }> =
    deptRef.success && deptRef.departmentOptions
      ? deptRef.departmentOptions
      : [{ id: '__all__', name: 'All Departments' }];

  const agencyOptions =
    agencyRef.success && agencyRef.agencyOptions
      ? agencyRef.agencyOptions
      : [{ id: '__all__', name: 'All Agents' }];

  return (
    <AgentWiseAppointmentsReportContent
      currentUserName={currentUserName}
      institutionOptions={INSTITUTION_OPTIONS}
      locationOptions={locationOptions}
      departmentOptions={departmentOptions}
      agencyOptions={agencyOptions}
    />
  );
}
