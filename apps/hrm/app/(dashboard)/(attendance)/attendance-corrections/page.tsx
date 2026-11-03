import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getAttendanceCorrectionFilterOptionsAction,
  getAttendanceCorrectionFormOptionsAction,
  getAttendanceCorrectionSummaryAction,
  getAttendanceCorrectionsAction,
  getAttendanceCorrectionsExportAction
} from '@/app/actions/attendance-actions/attendance-correction.actions';
import type { AttendanceCorrectionSummary } from '@/types/attendance';
import AttendanceCorrectionsWorkspace from './attendance-corrections-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    staffId?: string;
    staffCode?: string;
    department?: string;
    designation?: string;
    attendanceStatus?: string;
    correctedStatus?: string;
    requestedById?: string;
    fromDate?: string;
    toDate?: string;
  }>;
};

const EMPTY_SUMMARY: AttendanceCorrectionSummary = {
  totalCorrections: 0,
  pendingApproval: 0,
  approved: 0,
  rejected: 0
};

export default async function AttendanceCorrectionsPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/attendance-corrections');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'attendance-corrections.visited',
      entityType: 'AttendanceCorrection',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const listParams = {
    page: params?.page,
    limit: params?.limit,
    staffId: params?.staffId,
    staffCode: params?.staffCode,
    department: params?.department,
    designation: params?.designation,
    attendanceStatus: params?.attendanceStatus,
    correctedStatus: params?.correctedStatus,
    requestedById: params?.requestedById,
    fromDate: params?.fromDate,
    toDate: params?.toDate
  };

  const initialFilters = {
    staffId: params?.staffId,
    staffCode: params?.staffCode,
    department: params?.department,
    designation: params?.designation,
    attendanceStatus: params?.attendanceStatus,
    correctedStatus: params?.correctedStatus,
    requestedById: params?.requestedById,
    fromDate: params?.fromDate,
    toDate: params?.toDate
  };

  const [listRes, summaryRes, filterRes, formOptionsRes] = await Promise.all([
    getAttendanceCorrectionsAction(listParams),
    getAttendanceCorrectionSummaryAction(),
    getAttendanceCorrectionFilterOptionsAction(),
    getAttendanceCorrectionFormOptionsAction()
  ]);

  const records = listRes.isError ? [] : (listRes.data?.data ?? []);
  const totalRecords = listRes.isError ? 0 : (listRes.data?.totalRecords ?? 0);
  const summary = summaryRes.isError
    ? EMPTY_SUMMARY
    : (summaryRes.data ?? EMPTY_SUMMARY);
  const filterOptions = filterRes.isError
    ? {
        staff: [],
        departments: [],
        designations: [],
        attendanceStatuses: [],
        correctedStatuses: [],
        requesters: []
      }
    : (filterRes.data ?? {
        staff: [],
        departments: [],
        designations: [],
        attendanceStatuses: [],
        correctedStatuses: [],
        requesters: []
      });
  const formOptions = formOptionsRes.isError
    ? {
        staff: [],
        dayStatuses: [],
        statuses: []
      }
    : (formOptionsRes.data ?? {
        staff: [],
        dayStatuses: [],
        statuses: []
      });

  const handleExport = async () => {
    'use server';

    const exportResponse = await getAttendanceCorrectionsExportAction(listParams);
    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.message ?? 'No corrections to export'
      };
    }
    return {
      success: true,
      data: exportResponse.data
    };
  };

  return (
    <AttendanceCorrectionsWorkspace
      records={records}
      totalRecords={totalRecords}
      page={params?.page}
      summary={summary}
      initialFilters={initialFilters}
      filterOptions={filterOptions}
      formOptions={formOptions}
      onExport={handleExport}
    />
  );
}
