import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import {
  getExtraTimeExport,
  getExtraTimeFormOptionsAction,
  getExtraTimeRecordsAction
} from '@/app/actions/overtime-actions/overtime-extra-time.actions';
import type { ExtraTimeRecord } from '@/types/overtime';
import ExtraTimeWorkspace from './extra-time-workspace';

type SearchParams = {
  searchParams?: Promise<{
    staffId?: string;
    approverId?: string;
    fromDate?: string;
    toDate?: string;
  }>;
};

export default async function OvertimeExtraTimePage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/overtime-extra-time');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'overtime-extra-time.visited',
      entityType: 'OvertimeExtraTime',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters = {
    staffId: params?.staffId,
    approverId: params?.approverId,
    fromDate: params?.fromDate,
    toDate: params?.toDate
  };

  const [optionsRes, recordsRes] = await Promise.all([
    getExtraTimeFormOptionsAction(),
    getExtraTimeRecordsAction({
      ...filters,
      limit: process.env.DEFAULT_PAGE_SIZE
    })
  ]);

  const staffOptions = (optionsRes.data?.staff ?? []).map((staff) => ({
    id: staff.id,
    name: staff.code ? `${staff.code} — ${staff.name}` : staff.name
  }));

  const approverOptions = (optionsRes.data?.approvers ?? []).map(
    (approver) => ({
      id: approver.id,
      name: approver.name
    })
  );

  const records = (
    recordsRes.isError ? [] : (recordsRes.data?.data ?? [])
  ) as ExtraTimeRecord[];

  const handleExport = async () => {
    'use server';

    const exportResponse = await getExtraTimeExport({
      staffId: params?.staffId,
      approverId: params?.approverId,
      fromDate: params?.fromDate,
      toDate: params?.toDate
    });

    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.message ?? 'No extra time records found'
      };
    }

    return {
      success: true,
      data: exportResponse.data.map((row) => ({
        formNumber: row.formNumber,
        staffCode: row.staffCode,
        staffName: row.staffName,
        roster: row.roster,
        shiftStart: row.shiftStart,
        shiftEnd: row.shiftEnd,
        fromAt: row.fromAt,
        toAt: row.toAt,
        approverName: row.approverName,
        comment: row.comment,
        updatedByName: row.updatedByName,
        updatedAt: row.updatedAt,
        createdByName: row.createdByName,
        createdAt: row.createdAt
      }))
    };
  };

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Additional Extra Time Forms"
        description="Log approved additional working time outside standard rosters."
      />

      <ExtraTimeWorkspace
        records={records}
        staffOptions={staffOptions}
        approverOptions={approverOptions}
        filters={filters}
        onExport={handleExport}
      />
    </div>
  );
}
