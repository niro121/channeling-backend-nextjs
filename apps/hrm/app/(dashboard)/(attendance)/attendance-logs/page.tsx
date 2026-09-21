import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import {
  getAttendanceLogExportAction,
  getAttendanceLogRegisterAction,
  logAttendanceLogVisitAction
} from '@/app/actions/attendance-actions/attendance-log.actions';
import type { AttendanceLogCards } from '@/types/attendance';
import AttendanceLogsWorkspace from './attendance-logs-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    fromDate?: string;
    toDate?: string;
    staffSearch?: string;
    department?: string;
    actionType?: string;
    attendanceStatus?: string;
    source?: string;
    performedById?: string;
  }>;
};

const EMPTY_CARDS: AttendanceLogCards = {
  logEvents: 0,
  systemGenerated: 0,
  manualUpdates: 0,
  rejectedChanges: 0
};

const EMPTY_FILTER_OPTIONS = {
  departments: [] as { id: string; name: string }[],
  actionTypes: [] as { id: string; name: string }[],
  attendanceStatuses: [] as { id: string; name: string }[],
  sources: [] as { id: string; name: string }[],
  users: [] as { id: string; name: string }[]
};

export default async function AttendanceLogsPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/attendance-logs');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  void logAttendanceLogVisitAction();

  const params = await searchParams;
  const listParams = {
    page: params?.page,
    limit: params?.limit,
    fromDate: params?.fromDate,
    toDate: params?.toDate,
    staffSearch: params?.staffSearch,
    department: params?.department,
    actionType: params?.actionType,
    attendanceStatus: params?.attendanceStatus,
    source: params?.source,
    performedById: params?.performedById
  };

  const result = await getAttendanceLogRegisterAction(listParams);
  const data = result.isError ? null : result.data;

  const handleExport = async () => {
    'use server';

    const exportResponse = await getAttendanceLogExportAction(listParams);
    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.message ?? 'No logs to export'
      };
    }
    return {
      success: true,
      data: exportResponse.data
    };
  };

  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        {(result.errors as { message?: string })?.message ??
          'Unable to load attendance logs.'}
      </div>
    );
  }

  return (
    <AttendanceLogsWorkspace
      periodLabel={data.periodLabel}
      cards={data.cards ?? EMPTY_CARDS}
      rows={data.rows}
      totalRecords={data.totalRecords}
      page={params?.page}
      filterOptions={data.filterOptions ?? EMPTY_FILTER_OPTIONS}
      initialFilters={{
        fromDate: params?.fromDate ?? data.fromDate,
        toDate: params?.toDate ?? data.toDate,
        staffSearch: params?.staffSearch,
        department: params?.department,
        actionType: params?.actionType,
        attendanceStatus: params?.attendanceStatus,
        source: params?.source,
        performedById: params?.performedById
      }}
      onExport={handleExport}
    />
  );
}
