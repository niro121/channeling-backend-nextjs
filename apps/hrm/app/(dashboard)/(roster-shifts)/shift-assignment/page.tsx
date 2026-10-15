import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getShiftAssignmentFilterOptionsAction,
  getShiftAssignmentFormOptionsAction,
  getShiftAssignmentSummaryAction,
  getShiftAssignmentsAction,
  getShiftAssignmentsExport
} from '@/app/actions/roster-actions/shift-assignment.actions';
import type { ShiftAssignmentRecord, ShiftAssignmentSummary } from '@/types/roster';
import ShiftAssignmentWorkspace from './shift-assignment-workspace';
import type { AssignmentFilterValues } from './section-assignment-filters';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    institution?: string;
    department?: string;
    unit?: string;
    designation?: string;
    staffCategory?: string;
    staffGrade?: string;
    employeeStatus?: string;
    search?: string;
    status?: string;
  }>;
};

const EMPTY_SUMMARY: ShiftAssignmentSummary = {
  assignedStaff: 0,
  activeStaffTotal: 0,
  unassigned: 0,
  rotationPatterns: 0,
  expiringSoon: 0
};

export default async function ShiftAssignmentPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/shift-assignment');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'shift-assignment.visited',
      entityType: 'ShiftAssignment',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters: AssignmentFilterValues = {
    institutionId: params?.institution ?? '',
    departmentId: params?.department ?? '',
    unitId: params?.unit ?? '',
    designationId: params?.designation ?? '',
    staffCategoryId: params?.staffCategory ?? '',
    staffGradeId: params?.staffGrade ?? '',
    employeeStatusId: params?.employeeStatus ?? '',
    staffSearch: params?.search ?? ''
  };

  const listParams = {
    page: params?.page,
    limit: params?.limit,
    institution: params?.institution,
    department: params?.department,
    unit: params?.unit,
    designation: params?.designation,
    staffCategory: params?.staffCategory,
    staffGrade: params?.staffGrade,
    employeeStatus: params?.employeeStatus,
    search: params?.search,
    status: params?.status
  };

  const [listRes, summaryRes, filterOptionsRes, formOptionsRes] =
    await Promise.all([
      getShiftAssignmentsAction(listParams),
      getShiftAssignmentSummaryAction(),
      getShiftAssignmentFilterOptionsAction(),
      getShiftAssignmentFormOptionsAction()
    ]);

  const records = (
    listRes.isError ? [] : (listRes.data?.data ?? [])
  ) as ShiftAssignmentRecord[];
  const totalRecords = listRes.isError
    ? 0
    : (listRes.data?.totalRecords ?? 0);
  const summary = summaryRes.isError
    ? EMPTY_SUMMARY
    : (summaryRes.data ?? EMPTY_SUMMARY);
  const filterOptions = filterOptionsRes.isError
    ? {
        institutions: [],
        departments: [],
        units: [],
        designations: [],
        staffCategories: [],
        staffGrades: [],
        employeeStatuses: []
      }
    : (filterOptionsRes.data ?? {
        institutions: [],
        departments: [],
        units: [],
        designations: [],
        staffCategories: [],
        staffGrades: [],
        employeeStatuses: []
      });
  const formOptions = formOptionsRes.isError
    ? { staff: [], shiftTypes: [] }
    : (formOptionsRes.data ?? { staff: [], shiftTypes: [] });

  const handleExport = async () => {
    'use server';

    const exportResponse = await getShiftAssignmentsExport(listParams);
    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No shift assignments found'
          : (exportResponse.message ?? 'Failed to export shift assignments')
      };
    }

    return {
      success: true,
      data: exportResponse.data.map((row) => ({
        staffCode: row.staffCode,
        staffName: row.staffName,
        department: row.department,
        unit: row.unit,
        designation: row.designation,
        assignedShift: row.shiftTypeName ?? '',
        effectiveFrom: row.effectiveFrom,
        effectiveTo: row.effectiveTo ?? '',
        status: row.status,
        updatedBy: row.updatedUser?.name ?? '',
        updatedAt: row.updatedAt,
        createdBy: row.createdUser?.name ?? '',
        createdAt: row.createdAt
      }))
    };
  };

  return (
    <ShiftAssignmentWorkspace
      records={records}
      totalRecords={totalRecords}
      page={params?.page}
      filters={filters}
      summary={summary}
      filterOptions={filterOptions}
      formOptions={formOptions}
      onExport={handleExport}
    />
  );
}
