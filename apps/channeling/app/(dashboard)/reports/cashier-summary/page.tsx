import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { getReportUserOptionsAction } from '@/app/actions/reports/user-activity.action';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getShiftById } from '@/services/shift.service';
import { formatLocalDateTimeMinute } from '@/lib/handover-utils';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';
import CashierSummaryContent from './cashier-summary-content';

export const dynamic = 'force-dynamic';

type SearchParams = {
  searchParams?: Promise<{
    shiftId?: string;
    userId?: string;
    userIds?: string;
    locationId?: string;
    dateFrom?: string;
    dateTo?: string;
    format?: 'summary' | 'detail';
  }>;
};

function parseUserIdsParam(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id !== '' && id !== '__all__')
    ),
  ];
}

export default async function CashierSummaryReportPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/reports');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;
  const [userOptionsRes, locationOptionsRes, session] = await Promise.all([
    getReportUserOptionsAction(),
    getReportFilterOptions({ locations: true }),
    fetchServerSession(),
  ]);
  const initialUserOptions = userOptionsRes.success && userOptionsRes.data ? userOptionsRes.data : [];
  const initialLocationOptions =
    locationOptionsRes.success && locationOptionsRes.locationOptions
      ? locationOptionsRes.locationOptions
      : [{ id: '__all__', name: 'All Branches' }];
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
        userIds?: string[];
        locationId?: string;
        dateFrom: string;
        dateTo: string;
        format: 'summary' | 'detail';
      }
    | undefined;
  let autoSearchOnLoad = false;

  const format: 'summary' | 'detail' = params?.format === 'summary' ? 'summary' : 'detail';
  const dateFrom = params?.dateFrom?.trim() ?? '';
  const dateTo = params?.dateTo?.trim() ?? '';
  const locationId =
    params?.locationId?.trim() && params.locationId.trim() !== '__all__'
      ? params.locationId.trim()
      : undefined;
  const userIdsFromParam = parseUserIdsParam(params?.userIds);
  const singleUserId = params?.userId?.trim() && params.userId.trim() !== '__all__' ? params.userId.trim() : '';

  // Prefer explicit date range (e.g. handover deep-link) over shiftId.
  if (dateFrom && dateTo) {
    const userIds =
      userIdsFromParam.length > 0
        ? userIdsFromParam
        : singleUserId
          ? [singleUserId]
          : [];
    initialFilters = {
      userId: userIds.length === 1 ? userIds[0] : userIds.length > 1 ? '__all__' : singleUserId || '__all__',
      userIds: userIds.length > 1 ? userIds : undefined,
      locationId,
      dateFrom,
      dateTo,
      format,
    };
    autoSearchOnLoad = true;
  } else if (params?.shiftId?.trim()) {
    const shift = await getShiftById(params.shiftId.trim());
    if (shift?.id && shift?.userId && shift?.startedAt) {
      const start = new Date(shift.startedAt);
      const end = shift.endedAt ? new Date(shift.endedAt) : new Date();
      initialFilters = {
        userId: String(shift.userId),
        locationId: shift.locationId ?? locationId,
        dateFrom: formatLocalDateTimeMinute(start),
        dateTo: formatLocalDateTimeMinute(end),
        format,
      };
      autoSearchOnLoad = true;
    }
  }

  return (
    <CashierSummaryContent
      initialUserOptions={initialUserOptions}
      initialLocationOptions={initialLocationOptions}
      currentUserName={currentUserName}
      initialFilters={initialFilters}
      autoSearchOnLoad={autoSearchOnLoad}
    />
  );
}
