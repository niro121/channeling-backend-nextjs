import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getPaysheetComponentOptionsAction } from '@/app/actions/hr-admin-actions/paysheet-component.actions';
import {
  getPayrollStaffOptionsAction,
  getPaysheetAssignmentListAction
} from '@/app/actions/payroll-actions/paysheet-assignment.actions';
import {
  DEPARTMENT_OPTIONS,
  ROSTER_OPTIONS,
  STAFF_DESIGNATION_OPTIONS
} from '@/types/staff-employment-options';
import type {
  PaysheetAssignmentRecord,
  PaysheetStaffOption,
  SalaryFilterOption
} from '@/types/payroll';
import type { PaysheetComponentOption } from '@/types/paysheet-component';
import AssignPaysheetWorkspace from './assign-paysheet-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    staffId?: string;
    staffCode?: string;
    epfNumber?: string;
    componentId?: string;
    fromDate?: string;
    toDate?: string;
    departmentId?: string;
    institution?: string;
    staffCategory?: string;
    designationId?: string;
    rosterId?: string;
  }>;
};

export default async function AssignPaysheetComponentPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/assign-paysheet-component');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'assign-paysheet-component.visited',
      entityType: 'PaysheetAssignment',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters = {
    staffId: params?.staffId || undefined,
    staffCode: params?.staffCode?.trim() || undefined,
    epfNumber: params?.epfNumber?.trim() || undefined,
    componentId: params?.componentId || undefined,
    fromDate: params?.fromDate || undefined,
    toDate: params?.toDate || undefined,
    departmentId: params?.departmentId || undefined,
    institution: params?.institution || undefined,
    staffCategory: params?.staffCategory || undefined,
    designationId: params?.designationId || undefined,
    rosterId: params?.rosterId || undefined,
    page: params?.page ? Number(params.page) : undefined,
    limit: process.env.DEFAULT_PER_PAGE
      ? Number(process.env.DEFAULT_PER_PAGE)
      : undefined
  };

  const [listRes, componentRes, staffRes] = await Promise.all([
    getPaysheetAssignmentListAction(filters),
    getPaysheetComponentOptionsAction(),
    getPayrollStaffOptionsAction()
  ]);

  const records: PaysheetAssignmentRecord[] = listRes.isError
    ? []
    : (listRes.data ?? []);
  const totalRecords = listRes.isError ? 0 : listRes.total;
  const componentOptions: PaysheetComponentOption[] = componentRes.isError
    ? []
    : (componentRes.data ?? []);
  const staffOptions: PaysheetStaffOption[] = staffRes.isError
    ? []
    : (staffRes.data ?? []);

  const departmentOptions: SalaryFilterOption[] = DEPARTMENT_OPTIONS.map(
    (item) => ({ id: item.id, name: item.name })
  );
  const designationOptions: SalaryFilterOption[] =
    STAFF_DESIGNATION_OPTIONS.map((item) => ({
      id: item.id,
      name: item.name
    }));
  const rosterOptions: SalaryFilterOption[] = ROSTER_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));

  return (
    <AssignPaysheetWorkspace
      initialRecords={records}
      totalRecords={totalRecords}
      page={params?.page}
      componentOptions={componentOptions}
      staffOptions={staffOptions}
      departmentOptions={departmentOptions}
      designationOptions={designationOptions}
      rosterOptions={rosterOptions}
      initialFilters={{
        staffId: filters.staffId,
        staffCode: filters.staffCode,
        epfNumber: filters.epfNumber,
        componentId: filters.componentId,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        departmentId: filters.departmentId,
        institution: filters.institution,
        staffCategory: filters.staffCategory,
        designationId: filters.designationId,
        rosterId: filters.rosterId
      }}
    />
  );
}
