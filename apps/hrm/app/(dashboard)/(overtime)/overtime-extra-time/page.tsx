import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import ExtraTimeWorkspace from './extra-time-workspace';
import {
  SAMPLE_EXTRA_TIME_APPROVERS,
  SAMPLE_EXTRA_TIME_RECORDS,
  SAMPLE_EXTRA_TIME_STAFF,
  filterExtraTimeRecords
} from './sample-data';

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

  const records = filterExtraTimeRecords(SAMPLE_EXTRA_TIME_RECORDS, filters);

  const handleExport = async () => {
    'use server';

    const exportRows = filterExtraTimeRecords(SAMPLE_EXTRA_TIME_RECORDS, {
      staffId: params?.staffId,
      approverId: params?.approverId,
      fromDate: params?.fromDate,
      toDate: params?.toDate
    });

    if (!exportRows.length) {
      return {
        success: false,
        message: 'No extra time records found'
      };
    }

    return {
      success: true,
      data: exportRows.map((row) => ({
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
        staffOptions={SAMPLE_EXTRA_TIME_STAFF}
        approverOptions={SAMPLE_EXTRA_TIME_APPROVERS}
        filters={filters}
        onExport={handleExport}
      />
    </div>
  );
}
