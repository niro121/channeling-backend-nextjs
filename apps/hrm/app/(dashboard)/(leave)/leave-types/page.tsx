import React, { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { BulkDeleteButton, Button, CustomDataTable } from '@archmage/ui';
import { Plus } from 'lucide-react';
import Loading from '../../loading';
import { authOptions } from '@/lib/auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { ExportWrapper } from '../../export-wrapper';
import LeaveTypeFilterSection from './filter-section';
import { leaveTypeColumns, type LeaveTypeRecord } from './columns';
import { sampleLeaveTypes } from './sample-data';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    status?: string;
    isPaid?: string;
    requiresApproval?: string;
    allowHalfDay?: string;
  }>;
};

function matchesYesNoFlag(value: boolean, query?: string): boolean {
  if (!query || query === '__all__') return true;
  if (query === 'yes') return value === true;
  if (query === 'no') return value === false;
  return true;
}

function filterLeaveTypes(
  rows: LeaveTypeRecord[],
  filters: {
    status?: string;
    isPaid?: string;
    requiresApproval?: string;
    allowHalfDay?: string;
  }
): LeaveTypeRecord[] {
  return rows.filter((row) => {
    if (
      filters.status &&
      filters.status !== '__all__' &&
      String(row.status) !== filters.status
    ) {
      return false;
    }

    if (!matchesYesNoFlag(row.isPaid, filters.isPaid)) return false;
    if (!matchesYesNoFlag(row.requiresApproval, filters.requiresApproval))
      return false;
    if (!matchesYesNoFlag(row.allowHalfDay, filters.allowHalfDay)) return false;

    return true;
  });
}

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
  const filtered = filterLeaveTypes(sampleLeaveTypes, {
    status: params?.status,
    isPaid: params?.isPaid,
    requiresApproval: params?.requiresApproval,
    allowHalfDay: params?.allowHalfDay
  });

  const handleExport = async () => {
    'use server';

    const rows = filterLeaveTypes(sampleLeaveTypes, {
      status: params?.status,
      isPaid: params?.isPaid,
      requiresApproval: params?.requiresApproval,
      allowHalfDay: params?.allowHalfDay
    });

    if (!rows.length) {
      return { success: false, message: 'No leave types found' };
    }

    return {
      success: true,
      data: rows.map((row) => ({
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

  const bulkDeleteStub = async (ids: string[]) => {
    'use server';
    console.info('[leave-types] bulk delete stub', ids);
    return true;
  };

  const bulkDeleteDescription = async (ids: string[]) => {
    'use server';
    return `This will permanently delete ${ids.length} leave type${ids.length === 1 ? '' : 's'}. This action cannot be undone.`;
  };

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="Leave Types"
          subHeading="Manage leave type definitions used by entitlement and application workflows."
          columns={leaveTypeColumns}
          data={filtered}
          rowCount={filtered.length}
          page={params?.page}
          haveBulkDelete
          deleteServerAction={bulkDeleteStub}
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
              <Link href="/leave-types/add">
                <Button size="sm" className="gap-1.5 h-9 cursor-pointer">
                  <Plus className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Add New
                  </span>
                </Button>
              </Link>
            </div>
          }
          hideAutoBulkDelete
        />
      </Suspense>
    </div>
  );
}
