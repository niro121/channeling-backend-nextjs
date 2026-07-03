import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { ShiftColumns, type ShiftListRow } from './columns';
import ShiftsFilterSection from './filter-section';
import Loading from '../loading';
import { getShiftsAction, getShiftUserOptionsAction } from '@/app/actions/shift.actions';
import { checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { redirect } from 'next/navigation';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
  }>;
};

export default async function ShiftsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/shifts');
  if (!canView) redirect('/unauthorized-access');
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'shifts.visited',
      entityType: 'Shifts',
      importance: 'low',
    });
  }

  const params = await searchParams;
  const userIdParam = params?.userId && params.userId !== '__all__' ? params.userId : undefined;

  const [shiftsRes, userOptionsRes] = await Promise.all([
    getShiftsAction({
      page: params?.page,
      limit: params?.limit,
      dateFrom: params?.dateFrom ?? null,
      dateTo: params?.dateTo ?? null,
      userId: userIdParam ?? null,
    }),
    getShiftUserOptionsAction(),
  ]);

  const data: ShiftListRow[] = shiftsRes.success && shiftsRes.data ? shiftsRes.data : [];
  const totalRecords = shiftsRes.success ? shiftsRes.totalRecords ?? 0 : 0;
  const userOptions = userOptionsRes.success && userOptionsRes.data ? userOptionsRes.data : [];

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable<ShiftListRow, unknown>
          heading="Shifts"
          subHeading="View all shifts. Filter by date range or user."
          columns={ShiftColumns}
          data={data}
          rowCount={totalRecords}
          haveBulkDelete={false}
          page={params?.page}
          toolbarLeft={
            <div className="flex flex-wrap items-center gap-3">
              <ShiftsFilterSection
                userOptions={userOptions}
                userId={params?.userId}
                dateFrom={params?.dateFrom}
                dateTo={params?.dateTo}
              />
            </div>
          }
        />
      </Suspense>
    </div>
  );
}
