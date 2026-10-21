import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getPaysheetComponentOptionsAction } from '@/app/actions/hr-admin-actions/paysheet-component.actions';
import {
  getPayrollEmploymentFilterOptionsAction,
  getPayrollStaffOptionsAction
} from '@/app/actions/payroll-actions/paysheet-assignment.actions';
import {
  getLoanAdvanceListAction,
  getLoanAdvanceSummaryAction
} from '@/app/actions/payroll-actions/loan-advance.actions';
import {
  EMPTY_LOAN_ADVANCE_SUMMARY,
  type LoanAdvanceRecord,
  type LoanAdvanceSummary,
  type PaysheetStaffOption,
  type SalaryFilterOption
} from '@/types/payroll';
import type { PaysheetComponentOption } from '@/types/paysheet-component';
import LoansAdvancesWorkspace from './loans-advances-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    fromDate?: string;
    componentId?: string;
    staffId?: string;
    departmentId?: string;
    institution?: string;
    staffCategory?: string;
    designationId?: string;
    rosterId?: string;
  }>;
};

export default async function LoansAdvancesPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/loans-advances');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'loans-advances.visited',
      entityType: 'LoanAdvance',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters = {
    fromDate: params?.fromDate || undefined,
    componentId: params?.componentId || undefined,
    staffId: params?.staffId || undefined,
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

  const [
    listRes,
    summaryRes,
    componentRes,
    staffRes,
    employmentOptsRes
  ] = await Promise.all([
    getLoanAdvanceListAction(filters),
    getLoanAdvanceSummaryAction(filters),
    getPaysheetComponentOptionsAction({ typeIds: ['loan', 'advance'] }),
    getPayrollStaffOptionsAction(),
    getPayrollEmploymentFilterOptionsAction()
  ]);

  const records: LoanAdvanceRecord[] = listRes.isError
    ? []
    : (listRes.data ?? []);
  const totalRecords = listRes.isError ? 0 : listRes.total;
  const summary: LoanAdvanceSummary = summaryRes.isError
    ? EMPTY_LOAN_ADVANCE_SUMMARY
    : (summaryRes.data ?? EMPTY_LOAN_ADVANCE_SUMMARY);
  const componentOptions: PaysheetComponentOption[] = componentRes.isError
    ? []
    : (componentRes.data ?? []);
  const staffOptions: PaysheetStaffOption[] = staffRes.isError
    ? []
    : (staffRes.data ?? []);
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
    <LoansAdvancesWorkspace
      initialRecords={records}
      totalRecords={totalRecords}
      summary={summary}
      page={params?.page}
      componentOptions={componentOptions}
      staffOptions={staffOptions}
      departmentOptions={departmentOptions}
      designationOptions={designationOptions}
      rosterOptions={rosterOptions}
      initialFilters={{
        fromDate: filters.fromDate,
        componentId: filters.componentId,
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
