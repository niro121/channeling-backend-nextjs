import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import ExtraShiftWorkspace from './extra-shift-workspace';
import {
  SAMPLE_EXTRA_SHIFT_APPROVERS,
  SAMPLE_EXTRA_SHIFT_RECORDS,
  SAMPLE_EXTRA_SHIFT_STAFF,
  filterExtraShiftRecords
} from './sample-data';

type SearchParams = {
  searchParams?: Promise<{
    staffId?: string;
    approverId?: string;
    fromDate?: string;
    toDate?: string;
  }>;
};

export default async function OvertimeExtraShiftPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/overtime-day-off-ph-shift');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'overtime-day-off-ph-shift.visited',
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

  const records = filterExtraShiftRecords(SAMPLE_EXTRA_SHIFT_RECORDS, filters);

  const handleExport = async () => {
    'use server';

    const exportRows = filterExtraShiftRecords(SAMPLE_EXTRA_SHIFT_RECORDS, {
      staffId: params?.staffId,
      approverId: params?.approverId,
      fromDate: params?.fromDate,
      toDate: params?.toDate
    });

    if (!exportRows.length) {
      return {
        success: false,
        message: 'No Day Off / PH shift records found'
      };
    }

    return {
      success: true,
      data: exportRows.map((row) => ({
        formNumber: row.formNumber,
        staffCode: row.staffCode,
        staffName: row.staffName,
        shiftType: row.shiftType,
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
        title="Day Off / PH Shift"
        description="Log approved day-off and public-holiday shift cover outside standard rosters."
      />

      <ExtraShiftWorkspace
        records={records}
        staffOptions={SAMPLE_EXTRA_SHIFT_STAFF}
        approverOptions={SAMPLE_EXTRA_SHIFT_APPROVERS}
        filters={filters}
        onExport={handleExport}
      />
    </div>
  );
}
