import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { getReportUserOptionsAction } from '@/app/actions/reports/user-activity.action';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getShiftById } from '@/services/shift.service';
import CashierSummaryContent from './cashier-summary-content';

export const dynamic = 'force-dynamic';

type SearchParams = {
  searchParams?: Promise<{
    shiftId?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    format?: 'summary' | 'detail';
  }>;
};

export default async function CashierSummaryReportPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/reports');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;
  const userOptionsRes = await getReportUserOptionsAction();
  const initialUserOptions = userOptionsRes.success && userOptionsRes.data ? userOptionsRes.data : [];
  const session = await fetchServerSession();
  const currentUser =
    session?.user?.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, name: true, staff: { select: { code: true } } },
        })
      : null;
  const currentUserName = formatUserDisplayName(currentUser?.name ?? session?.user?.name, currentUser?.id ?? session?.user?.id, currentUser?.staff?.code);

  let initialFilters:
    | {
        userId: string;
        dateFrom: string;
        dateTo: string;
        format: 'summary' | 'detail';
      }
    | undefined;
  let autoSearchOnLoad = false;

  if (params?.shiftId?.trim()) {
    const shift = await getShiftById(params.shiftId.trim());
    if (shift?.id && shift?.userId && shift?.startedAt) {
      const start = new Date(shift.startedAt);
      const end = shift.endedAt ? new Date(shift.endedAt) : new Date();
      initialFilters = {
        userId: String(shift.userId),
        dateFrom: start.toISOString().slice(0, 16),
        dateTo: end.toISOString().slice(0, 16),
        format: params?.format === 'summary' ? 'summary' : 'detail',
      };
      autoSearchOnLoad = true;
    }
  }

  return (
    <CashierSummaryContent
      initialUserOptions={initialUserOptions}
      currentUserName={currentUserName}
      initialFilters={initialFilters}
      autoSearchOnLoad={autoSearchOnLoad}
    />
  );
}
