import React, { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { BulkDeleteButton, Button, CustomDataTable } from '@archmage/ui';
import { Plus } from 'lucide-react';
import Loading from '../../loading';
import { authOptions } from '@/lib/auth';
import { checkPermission, checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { ExportWrapper } from '../../export-wrapper';
import LeaveTypeFilterSection from './filter-section';
import { leaveTypeColumns } from './columns';
import {
  bulkDeleteLeaveTypesAction,
  getLeaveTypesAction,
  getLeaveTypesExport
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
  const response = await getLeaveTypesAction({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    status: params?.status,
    isPaid: params?.isPaid,
    requiresApproval: params?.requiresApproval,
    allowHalfDay: params?.allowHalfDay
  });

  const data = response.isError ? [] : (response.data?.data ?? []);
  const totalRecords = response.isError
    ? 0
    : (response.data?.totalRecords ?? 0);

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
      data: exportResponse.data.map((row: any) => ({
        code: row.code,
        name: row.name,
        status: row.status === 1 ? 'Published' : 'Unpublished',
        paidType: row.isPaid ? 'Paid' : 'Unpaid',
        approvalRequired: row.requiresApproval ? 'Yes' : 'No',
        halfDayAllowed: row.allowHalfDay ? 'Yes' : 'No',
        carryForwardAllowed: row.carryForwardAllowed ? 'Yes' : 'No'
      }))
    };
  };

  const bulkDeleteDescription = async (ids: string[]) => {
    'use server';
    return `This will permanently delete ${ids.length} leave type${ids.length === 1 ? '' : 's'}. This action cannot be undone.`;
  };

  const canAdd = await checkPermission('leave-types', 'add');

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="Leave Types"
          subHeading="Manage leave type definitions used by entitlement and application workflows."
          columns={leaveTypeColumns}
          data={data}
          rowCount={totalRecords}
          page={params?.page}
          haveBulkDelete
          deleteServerAction={bulkDeleteLeaveTypesAction}
          getBulkDeleteDescription={bulkDeleteDescription}
          toolbarLeft={
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <LeaveTypeFilterSection
                status={params?.status}
                isPaid={params?.isPaid}
                requiresApproval={params?.requiresApproval}
                allowHalfDay={params?.allowHalfDay}
              />
              <div className="flex items-center">
                <ExportWrapper
                  serverData={handleExport}
                  columns={[
                    'Code',
                    'Name',
                    'Status',
                    'Paid Type',
                    'Approval Required',
                    'Half-day Allowed',
                    'Carry Forward Allowed'
                  ]}
                  keys={[
                    'code',
                    'name',
                    'status',
                    'paidType',
                    'approvalRequired',
                    'halfDayAllowed',
                    'carryForwardAllowed'
                  ]}
                  title="Leave Types"
                  fileName="leave-types"
                />
              </div>
            </div>
          }
          toolbarRight={
            <div className="flex items-start gap-2 shrink-0">
              <BulkDeleteButton />
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
          }
          hideAutoBulkDelete
        />
      </Suspense>
    </div>
  );
}
