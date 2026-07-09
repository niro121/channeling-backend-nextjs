import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SearchInput } from '@archmage/ui';
import { CustomDataTable } from '@archmage/ui';
import { staffColumns } from './columns';
import Loading from '../loading';
import { checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { redirect } from 'next/navigation';
import { getStaffAction } from '@/app/actions/staff-actions/staff.actions';
import { SyncStaffButton } from './sync-staff-button';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
  }>;
};

export default async function StaffPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/staff');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'staff.visited',
      entityType: 'Staff',
      importance: 'low'
    });
  }

  const resolvedSearchParams = await searchParams;
  const response = await getStaffAction({
    page: resolvedSearchParams?.page,
    limit: resolvedSearchParams?.limit,
    keyword: resolvedSearchParams?.keyword
  });

  const data = response.isError ? [] : (response.data?.data ?? []);
  const totalRecords = response.isError ? 0 : (response.data?.totalRecords ?? 0);

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="Staff"
          subHeading="View staff stored in HRM. Use Refresh to import or update records from Channeling."
          columns={staffColumns}
          data={data}
          rowCount={totalRecords}
          page={resolvedSearchParams?.page}
          haveBulkDelete={false}
          toolbarLeft={
            <div className="relative w-full sm:max-w-sm">
              <SearchInput
                name="keyword"
                placeholder="Search by name, code, NIC, contact"
                className="pl-8 w-full h-9"
              />
            </div>
          }
          toolbarRight={<SyncStaffButton />}
        />
      </Suspense>
    </div>
  );
}
