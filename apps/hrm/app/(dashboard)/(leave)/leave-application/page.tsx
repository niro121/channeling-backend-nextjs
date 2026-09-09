import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import { formatDate } from '@/lib/utils/date';
import {
  bulkDeleteLeaveApplicationsAction,
  getLeaveApplicationFormOptionsAction,
  getLeaveApplicationsAction,
  getLeaveApplicationsExport
} from '@/app/actions/leave-actions/leave-application.actions';
import type { LeaveApplicationRecord } from '@/types/leave';
import LeaveApplicationWorkspace from './leave-application-workspace';

type SearchParams = {
  searchParams?: Promise<{
    staffId?: string;
    leaveType?: string;
    approverId?: string;
    fromDate?: string;
    toDate?: string;
    dateSearchBy?: string;
    outWithCancel?: string;
  }>;
};

export default async function LeaveApplicationPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/leave-application');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'leave-application.visited',
      entityType: 'LeaveApplication',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters = {
    staffId: params?.staffId,
    leaveType: params?.leaveType,
    approverId: params?.approverId,
    fromDate: params?.fromDate,
    toDate: params?.toDate,
    dateSearchBy: params?.dateSearchBy,
    outWithCancel: params?.outWithCancel
  };

  const leaveTypeId =
    filters.leaveType && filters.leaveType !== '__all__'
      ? filters.leaveType
      : undefined;

  const [optionsRes, applicationsRes] = await Promise.all([
    getLeaveApplicationFormOptionsAction(),
    getLeaveApplicationsAction({
      staffId: filters.staffId,
      leaveTypeId,
      approverId: filters.approverId,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      dateSearchBy: filters.dateSearchBy,
      outWithCancel: filters.outWithCancel,
      limit: process.env.DEFAULT_PAGE_SIZE
    })
  ]);

  const staffOptions = (optionsRes.data?.staff ?? []).map((staff) => ({
    id: staff.id,
    name: staff.code ? `${staff.code} — ${staff.name}` : staff.name
  }));

  const leaveTypeOptions = (optionsRes.data?.leaveTypes ?? []).map((type) => ({
    id: type.id,
    name: type.code ? `${type.code} — ${type.name}` : type.name,
    allowHalfDay: Boolean((type as { allowHalfDay?: boolean }).allowHalfDay)
  }));

  const filterLeaveTypeOptions = [
    { id: '__all__', name: 'All Leave Types' },
    ...leaveTypeOptions.map(({ id, name }) => ({ id, name }))
  ];

  const approverOptions = (optionsRes.data?.approvers ?? []).map(
    (approver) => ({
      id: approver.id,
      name: approver.name
    })
  );

  const records = (
    applicationsRes.isError ? [] : (applicationsRes.data?.data ?? [])
  ) as LeaveApplicationRecord[];

  const handleExport = async () => {
    'use server';

    const exportResponse = await getLeaveApplicationsExport({
      staffId: params?.staffId,
      leaveTypeId:
        params?.leaveType && params.leaveType !== '__all__'
          ? params.leaveType
          : undefined,
      approverId: params?.approverId,
      fromDate: params?.fromDate,
      toDate: params?.toDate,
      dateSearchBy: params?.dateSearchBy,
      outWithCancel: params?.outWithCancel
    });

    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No leave application records found'
          : exportResponse.message
      };
    }

    return {
      success: true,
      data: exportResponse.data.map((row: LeaveApplicationRecord) => ({
        formNumber: row.formNumber ?? '',
        staffCode: row.staffCode,
        staffName: row.staffName,
        leaveType: row.leaveType,
        fromDate: row.fromDate,
        toDate: row.toDate,
        days: row.days,
        approverName: row.approverName,
        approvedAt: row.approvedAt ?? '',
        status: row.status,
        outWithCancel: row.outWithCancel ? 'Yes' : 'No',
        shiftDate: row.shiftDate,
        updatedBy: row.updatedUser?.name ?? '',
        updatedAt: formatDate(row.updatedAt),
        createdBy: row.createdUser?.name ?? '',
        createdAt: formatDate(row.createdAt)
      }))
    };
  };

  const handleBulkDelete = async (ids: string[]) => {
    'use server';
    return bulkDeleteLeaveApplicationsAction(ids);
  };

  const getBulkDeleteDescription = async (ids: string[]) => {
    'use server';
    return `This will permanently delete ${ids.length} leave application${ids.length === 1 ? '' : 's'}. This action cannot be undone.`;
  };

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Leave Application"
        description="Submit and track leave applications."
      />

      <LeaveApplicationWorkspace
        records={records}
        staffOptions={staffOptions}
        leaveTypeOptions={leaveTypeOptions}
        filterLeaveTypeOptions={filterLeaveTypeOptions}
        approverOptions={approverOptions}
        filters={{
          ...filters,
          leaveType: filters.leaveType
        }}
        onExport={handleExport}
        onBulkDelete={handleBulkDelete}
        getBulkDeleteDescription={getBulkDeleteDescription}
      />
    </div>
  );
}
