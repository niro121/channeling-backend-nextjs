import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import ChannelTransferReportContent from './channel-transfer-report-content';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';
import { getReferenceData } from '@/app/actions/reference/get-reference-data.action';

export const dynamic = 'force-dynamic';

export default async function ChannelTransferReportPage() {
  const canView = await checkRouteAccess('/reports/channel-transfer');
  if (!canView) redirect('/unauthorized-access');

  const [session, ref, usersRef] = await Promise.all([
    fetchServerSession(),
    getReportFilterOptions({ doctors: true }),
    getReferenceData({ users: true }),
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

  const doctorOptions: Array<{ id: string; name: string }> =
    ref.success && ref.doctorOptions ? ref.doctorOptions : [{ id: '__all__', name: 'All Doctors' }];

  const userOptions: Array<{ id: string; name: string }> =
    usersRef.success && usersRef.users ? usersRef.users.map((u) => ({ id: u.id, name: u.name })) : [];

  return (
    <ChannelTransferReportContent
      currentUserName={currentUserName}
      doctorOptions={doctorOptions}
      userOptions={userOptions}
    />
  );
}

