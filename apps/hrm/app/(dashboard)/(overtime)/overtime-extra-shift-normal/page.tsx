import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import ExtraShiftNormalWorkspace from './extra-shift-normal-workspace';
import {
  SAMPLE_EXTRA_SHIFT_NORMAL_APPROVERS,
  SAMPLE_EXTRA_SHIFT_NORMAL_RECORDS,
  SAMPLE_EXTRA_SHIFT_NORMAL_STAFF,
  filterExtraShiftNormalRecords
} from './sample-data';

type SearchParams = {
  searchParams?: Promise<{
    staffId?: string;
    approverId?: string;
    fromDate?: string;
    toDate?: string;
  }>;
};

export default async function OvertimeExtraShiftNormalPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/overtime-extra-shift-normal');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'overtime-extra-shift-normal.visited',
      entityType: 'OvertimeRequest',
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

  const records = filterExtraShiftNormalRecords(
    SAMPLE_EXTRA_SHIFT_NORMAL_RECORDS,
    filters
  );

  const handleExport = async () => {
    'use server';

    const exportRows = filterExtraShiftNormalRecords(
      SAMPLE_EXTRA_SHIFT_NORMAL_RECORDS,
      {
        staffId: params?.staffId,
        approverId: params?.approverId,
        fromDate: params?.fromDate,
        toDate: params?.toDate
      }
    );

    if (!exportRows.length) {
      return {
        success: false,
        message: 'No extra shift records found'
      };
    }

    return {
      success: true,
      data: exportRows.map((row) => ({
        formNumber: row.formNumber,
        staffCode: row.staffCode,
        staffName: row.staffName,
        roster: row.roster,
        fromAt: row.fromAt,
        toAt: row.toAt,
        shiftStart: row.shiftStart,
        shiftEnd: row.shiftEnd,
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
        title="Extra Shift Normal"
        description="Assign an additional shift outside the staff member's roster."
      />

      <ExtraShiftNormalWorkspace
        records={records}
        staffOptions={SAMPLE_EXTRA_SHIFT_NORMAL_STAFF}
        approverOptions={SAMPLE_EXTRA_SHIFT_NORMAL_APPROVERS}
        filters={filters}
        onExport={handleExport}
      />
    </div>
  );
}
