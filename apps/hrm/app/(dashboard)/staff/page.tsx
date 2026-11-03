import React, { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Button } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableBulkDeleteFeature
} from '@/components/common/common-data-table';
import { Plus } from 'lucide-react';
import Loading from '../loading';
import { authOptions } from '@/lib/auth';
import { checkPermission, checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { ExportWrapper } from '../export-wrapper';
import { staffColumns } from './columns';
import StaffFilterSection from './filter-section';
import { SyncStaffButton } from './sync-staff-button';
import {
  getStaffAction,
  bulkDeleteStaffAction,
  getStaffBulkDeleteDescriptionAction,
  getStaffExport
} from '@/app/actions/staff-actions/staff.actions';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    status?: string;
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

  const params = await searchParams;
  const response = await getStaffAction({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    status: params?.status
  });

  const data = response.isError ? [] : (response.data?.data ?? []);
  const totalRecords = response.isError
    ? 0
    : (response.data?.totalRecords ?? 0);

  const canAdd = await checkPermission('staff', 'add');

  const handleExport = async () => {
    'use server';

    const exportResponse = await getStaffExport({
      keyword: params?.keyword,
      status: params?.status
    });

    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No staff found'
          : exportResponse.message
      };
    }

    return {
      success: true,
      data: exportResponse.data.map((staff) => ({
        code: staff.code || '-',
        name: `${staff.title || ''} ${staff.name || ''}`.trim() || '-',
        nic: staff.nic || '-',
        contactMobile: staff.contactMobile || '-'
      }))
    };
  };

  const bulkDeleteDialog = async (ids: string[]) => {
    'use server';
    return getStaffBulkDeleteDescriptionAction(ids);
  };

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CommonDataTable
          heading="Staff"
          subHeading="View staff stored in HRM. Use Refresh to import or update records from Channeling."
          columns={staffColumns}
          data={data}
          rowCount={totalRecords}
          page={params?.page}
          haveBulkDelete
          deleteServerAction={bulkDeleteStaffAction}
          getChannelingBulkDeleteDialog={bulkDeleteDialog}
          toolbarLeft={
            <StaffFilterSection
              keyword={params?.keyword}
              status={params?.status}
            />
          }
          toolbarRight={
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="flex items-start justify-end gap-2 shrink-0">
                <DataTableBulkDeleteFeature />
                {canAdd ? (
                  <Link href="/staff/add">
                    <Button size="sm" className="gap-1.5 h-9 cursor-pointer">
                      <Plus className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Add New
                      </span>
                    </Button>
                  </Link>
                ) : null}
                {canAdd ? <SyncStaffButton /> : null}
              </div>
              <div className="flex items-center justify-end">
                <ExportWrapper
                  serverData={handleExport}
                  columns={['Code', 'Name', 'NIC', 'Contact']}
                  keys={['code', 'name', 'nic', 'contactMobile']}
                  title="Staff List"
                  fileName="staff"
                />
              </div>
            </div>
          }
        />
      </Suspense>
    </div>
  );
}
