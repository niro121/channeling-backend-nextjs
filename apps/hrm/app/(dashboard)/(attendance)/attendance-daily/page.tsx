import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import {
  getDailyAttendanceExportAction,
  getDailyAttendanceRegisterAction,
  logDailyAttendanceVisitAction
} from '@/app/actions/attendance-actions/daily-attendance.actions';
import type { DailyAttendanceSummary } from '@/types/attendance';
import DailyAttendanceWorkspace from './daily-attendance-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    date?: string;
    institution?: string;
    department?: string;
    room?: string;
    staffCategory?: string;
    designation?: string;
    staffId?: string;
    shiftTypeId?: string;
    status?: string;
  }>;
};

const EMPTY_SUMMARY: DailyAttendanceSummary = {
  present: 0,
  presentPct: null,
  absent: 0,
  absentPct: null,
  lateEarlyOut: 0,
  lateCount: 0,
  earlyOutCount: 0,
  missingPunches: 0,
  rosteredTotal: 0
};

const EMPTY_FILTER_OPTIONS = {
  institutions: [],
  departments: [],
  rooms: [],
  staffCategories: [],
  designations: [],
  staff: [],
  shifts: [],
  statuses: []
};

export default async function DailyAttendancePage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/attendance-daily');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  void logDailyAttendanceVisitAction();

  const params = await searchParams;
  const listParams = {
    page: params?.page,
    limit: params?.limit,
    date: params?.date,
    institution: params?.institution,
    department: params?.department,
    room: params?.room,
    staffCategory: params?.staffCategory,
    designation: params?.designation,
    staffId: params?.staffId,
    shiftTypeId: params?.shiftTypeId,
    status: params?.status
  };

  const result = await getDailyAttendanceRegisterAction(listParams);
  const data = result.isError ? null : result.data;

  const handleExport = async () => {
    'use server';

    const exportResponse = await getDailyAttendanceExportAction(listParams);
    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.message ?? 'No attendance to export'
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
          'Unable to load daily attendance.'}
      </div>
    );
  }

  return (
    <DailyAttendanceWorkspace
      date={data.date}
      dateLabel={data.dateLabel}
      summary={data.summary ?? EMPTY_SUMMARY}
      rows={data.rows}
      totalRecords={data.totalRecords}
      page={params?.page}
      initialFilters={{
        date: params?.date ?? data.date,
        institution: params?.institution,
        department: params?.department,
        room: params?.room,
        staffCategory: params?.staffCategory,
        designation: params?.designation,
        staffId: params?.staffId,
        shiftTypeId: params?.shiftTypeId,
        status: params?.status
      }}
      filterOptions={data.filterOptions ?? EMPTY_FILTER_OPTIONS}
      onExport={handleExport}
    />
  );
}
