import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getPaysheetComponentOptionsAction } from '@/app/actions/hr-admin-actions/paysheet-component.actions';
import {
  getBulkAssignableStaffListAction,
  getPayrollEmploymentFilterOptionsAction,
  getPayrollStaffOptionsAction,
  getRecentPaysheetAssignmentsAction
} from '@/app/actions/payroll-actions/paysheet-assignment.actions';
import type {
  BulkPaysheetStaffRow,
  PaysheetAssignmentRecord,
  PaysheetStaffOption,
  SalaryFilterOption
} from '@/types/payroll';
import type { PaysheetComponentOption } from '@/types/paysheet-component';
import BulkAssignWorkspace from './bulk-assign-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    staffId?: string;
    departmentId?: string;
    institution?: string;
    staffCategory?: string;
    designationId?: string;
    rosterId?: string;
  }>;
};

export default async function BulkAssignPaysheetComponentPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/bulk-assign-paysheet-component');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'bulk-assign-paysheet-component.visited',
      entityType: 'PaysheetAssignment',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const institution = params?.institution || undefined;
  const filters = {
    staffId: params?.staffId || undefined,
    departmentId: params?.departmentId || undefined,
    institution,
    staffCategory: params?.staffCategory || undefined,
    designationId: params?.designationId || undefined,
    rosterId: params?.rosterId || undefined,
    page: params?.page ? Number(params.page) : undefined,
    limit: process.env.DEFAULT_PER_PAGE
      ? Number(process.env.DEFAULT_PER_PAGE)
      : undefined
  };

  const [staffListRes, componentRes, staffOptRes, recentRes, employmentOptsRes] =
    await Promise.all([
      getBulkAssignableStaffListAction(filters),
      getPaysheetComponentOptionsAction(),
      getPayrollStaffOptionsAction(),
      getRecentPaysheetAssignmentsAction(20),
      getPayrollEmploymentFilterOptionsAction()
    ]);

  const staffRows: BulkPaysheetStaffRow[] = staffListRes.isError
    ? []
    : (staffListRes.data ?? []);
  const totalStaff = staffListRes.isError ? 0 : staffListRes.total;
  const componentOptions: PaysheetComponentOption[] = componentRes.isError
    ? []
    : (componentRes.data ?? []);
  const staffOptions: PaysheetStaffOption[] = staffOptRes.isError
    ? []
    : (staffOptRes.data ?? []);
  const recentRecords: PaysheetAssignmentRecord[] = recentRes.isError
    ? []
    : (recentRes.data ?? []);

  const departmentOptions: SalaryFilterOption[] = employmentOptsRes.isError
    ? []
    : (employmentOptsRes.data?.departments ?? []);
  const designationOptions: SalaryFilterOption[] = employmentOptsRes.isError
    ? []
    : (employmentOptsRes.data?.designations ?? []);
  const rosterOptions: SalaryFilterOption[] = employmentOptsRes.isError
    ? []
    : (employmentOptsRes.data?.rosters ?? []);

  return (
    <BulkAssignWorkspace
      staffRows={staffRows}
      totalStaff={totalStaff}
      page={params?.page}
      recentRecords={recentRecords}
      componentOptions={componentOptions}
      staffOptions={staffOptions}
      departmentOptions={departmentOptions}
      designationOptions={designationOptions}
      rosterOptions={rosterOptions}
      initialFilters={{
        staffId: filters.staffId,
        departmentId: filters.departmentId,
        institution: filters.institution,
        staffCategory: filters.staffCategory,
        designationId: filters.designationId,
        rosterId: filters.rosterId
      }}
    />
  );
}
