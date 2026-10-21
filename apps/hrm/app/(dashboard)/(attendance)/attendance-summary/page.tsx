import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import {
  getAttendanceSummaryExportAction,
  getAttendanceSummaryRegisterAction,
  logAttendanceSummaryVisitAction
} from '@/app/actions/attendance-actions/attendance-summary.actions';
import type { AttendanceSummaryCards } from '@/types/attendance';
import AttendanceSummaryWorkspace from './attendance-summary-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    fromDate?: string;
    toDate?: string;
    institution?: string;
    department?: string;
    room?: string;
    staffCategory?: string;
    designation?: string;
    staffId?: string;
    shiftTypeId?: string;
  }>;
};

const EMPTY_CARDS: AttendanceSummaryCards = {
  totalStaff: 0,
  present: 0,
  presentPct: null,
  absent: 0,
  absentPct: null,
  late: 0,
  leave: 0,
  dayOff: 0,
  holiday: 0,
  missingAttendance: 0,
  overtimeHours: 0
};

const EMPTY_FILTER_OPTIONS = {
  institutions: [] as { id: string; name: string }[],
  departments: [] as { id: string; name: string }[],
  rooms: [] as { id: string; name: string }[],
  staffCategories: [] as { id: string; name: string }[],
  designations: [] as { id: string; name: string }[],
  staff: [] as { id: string; name: string }[],
  shifts: [] as { id: string; name: string }[]
};

export default async function AttendanceSummaryPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/attendance-summary');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  void logAttendanceSummaryVisitAction();

  const params = await searchParams;
  const listParams = {
    page: params?.page,
    limit: params?.limit,
    fromDate: params?.fromDate,
    toDate: params?.toDate,
    institution: params?.institution,
    department: params?.department,
    room: params?.room,
    staffCategory: params?.staffCategory,
    designation: params?.designation,
    staffId: params?.staffId,
    shiftTypeId: params?.shiftTypeId
  };

  const result = await getAttendanceSummaryRegisterAction(listParams);
  const data = result.isError ? null : result.data;

  const handleExport = async () => {
    'use server';

    const exportResponse = await getAttendanceSummaryExportAction(listParams);
    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.message ?? 'No summary to export'
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
          'Unable to load attendance summary.'}
      </div>
    );
  }

  return (
    <AttendanceSummaryWorkspace
      fromDate={data.fromDate}
      toDate={data.toDate}
      periodLabel={data.periodLabel}
      cards={data.cards ?? EMPTY_CARDS}
      rows={data.rows}
      totalRecords={data.totalRecords}
      page={params?.page}
      filterOptions={data.filterOptions ?? EMPTY_FILTER_OPTIONS}
      initialFilters={{
        fromDate: params?.fromDate ?? data.fromDate,
        toDate: params?.toDate ?? data.toDate,
        institution: params?.institution,
        department: params?.department,
        room: params?.room,
        staffCategory: params?.staffCategory,
        designation: params?.designation,
        staffId: params?.staffId,
        shiftTypeId: params?.shiftTypeId
      }}
      onExport={handleExport}
    />
  );
}
