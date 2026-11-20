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
import Loading from '../../loading';
import { authOptions } from '@/lib/auth';
import { checkPermission, checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { formatDateTime } from '@/lib/utils/date';
import type { LeaveTypeRecord } from '@/types/leave';
import { ExportWrapper } from '../../export-wrapper';
import LeaveTypeFilterSection from './filter-section';
import { leaveTypeColumns } from './columns';
import {
  bulkDeleteLeaveTypesAction,
  getLeaveTypesAction,
  getLeaveTypesExport,
  getLieuLeaveTypeAction
} from '@/app/actions/leave-actions/leave-type.actions';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    status?: string;
    isPaid?: string;
    requiresApproval?: string;
    allowHalfDay?: string;
  }>;
};

export default async function LeaveTypesPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/leave-types');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'leave-types.visited',
      entityType: 'LeaveType',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const [response, lieuRes] = await Promise.all([
    getLeaveTypesAction({
      page: params?.page,
      limit: params?.limit,
      keyword: params?.keyword,
      status: params?.status,
      isPaid: params?.isPaid,
      requiresApproval: params?.requiresApproval,
      allowHalfDay: params?.allowHalfDay
    }),
    getLieuLeaveTypeAction()
  ]);

  const data = response.isError ? [] : (response.data?.data ?? []);
  const totalRecords = response.isError
    ? 0
    : (response.data?.totalRecords ?? 0);
  const lieuType = lieuRes.isError ? null : lieuRes.data;

  const handleExport = async () => {
    'use server';

    const exportResponse = await getLeaveTypesExport({
      keyword: params?.keyword,
      status: params?.status,
      isPaid: params?.isPaid,
      requiresApproval: params?.requiresApproval,
      allowHalfDay: params?.allowHalfDay
    });

    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No leave types found'
          : exportResponse.message
      };
    }

    return {
      success: true,
      data: exportResponse.data.map((row: LeaveTypeRecord) => ({
        code: row.code,
        name: row.name,
        status: row.status === 1 ? 'Published' : 'Unpublished',
        paidType: row.isPaid ? 'Paid' : 'Unpaid',
        approvalRequired: row.requiresApproval ? 'Yes' : 'No',
        halfDayAllowed: row.allowHalfDay ? 'Yes' : 'No',
        isLieuLeave: row.isLieuLeave ? 'Yes' : 'No',
        carryForwardAllowed: row.carryForwardAllowed ? 'Yes' : 'No',
        updatedBy: row.updatedUser?.name ?? '',
        updatedAt: formatDateTime(row.updatedAt),
        createdBy: row.createdUser?.name ?? '',
        createdAt: formatDateTime(row.createdAt)
      }))
    };
  };

  const bulkDeleteDescription = async (ids: string[]) => {
    'use server';
    return `This will permanently delete ${ids.length} leave type${ids.length === 1 ? '' : 's'}. This action cannot be undone.`;
  };

  const canAdd = await checkPermission('leave-types', 'add');
  const canEdit = await checkPermission('leave-types', 'edit');
  const canDelete = await checkPermission('leave-types', 'delete');

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CommonDataTable
          heading="Leave Types"
          subHeading="Manage leave type definitions used by entitlement and application workflows. Lieu is a single compensatory bank — use Add Lieu leave type once."
          columns={leaveTypeColumns}
          data={data}
          rowCount={totalRecords}
          page={params?.page}
          haveBulkDelete={canDelete}
          deleteServerAction={canDelete ? bulkDeleteLeaveTypesAction : undefined}
          getBulkDeleteDescription={canDelete ? bulkDeleteDescription : undefined}
          toolbarLeft={
            <LeaveTypeFilterSection
              status={params?.status}
              isPaid={params?.isPaid}
              requiresApproval={params?.requiresApproval}
              allowHalfDay={params?.allowHalfDay}
            />
          }
          toolbarRight={
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-end gap-2 shrink-0">
                {canDelete ? <DataTableBulkDeleteFeature /> : null}
                {lieuType?.id && canEdit ? (
                  <Link href={`/leave-types/${lieuType.id}/edit`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1.5 cursor-pointer"
                    >
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Edit Lieu ({lieuType.code})
                      </span>
                    </Button>
                  </Link>
                ) : null}
                {canAdd && !lieuType?.id ? (
                  <Link href="/leave-types/add-lieu">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Add Lieu
                      </span>
                    </Button>
                  </Link>
                ) : null}
                {canAdd ? (
                  <Link href="/leave-types/add">
                    <Button size="sm" className="gap-1.5 h-9 cursor-pointer">
                      <Plus className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Add New
                      </span>
                    </Button>
                  </Link>
                ) : null}
              </div>
              <div className="flex items-center justify-end">
                <ExportWrapper
                  serverData={handleExport}
                  columns={[
                    'Code',
                    'Name',
                    'Status',
                    'Paid Type',
                    'Approval Required',
                    'Half-day Allowed',
                    'Lieu',
                    'Carry Forward Allowed',
                    'Updated By',
                    'Updated At',
                    'Created By',
                    'Created At'
                  ]}
                  keys={[
                    'code',
                    'name',
                    'status',
                    'paidType',
                    'approvalRequired',
                    'halfDayAllowed',
                    'isLieuLeave',
                    'carryForwardAllowed',
                    'updatedBy',
                    'updatedAt',
                    'createdBy',
                    'createdAt'
                  ]}
                  title="Leave Types"
                  fileName="leave-types"
                />
              </div>
            </div>
          }
        />
      </Suspense>
    </div>
  );
}
