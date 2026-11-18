import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getPayrollEmploymentFilterOptionsAction,
  getPayrollStaffOptionsAction
} from '@/app/actions/payroll-actions/paysheet-assignment.actions';
import {
  getPerformanceAllowanceListAction,
  getPerformanceAllowanceSummaryAction
} from '@/app/actions/payroll-actions/performance-allowance.actions';
import {
  EMPTY_PERFORMANCE_ALLOWANCE_SUMMARY,
  type PerformanceAllowanceMode,
  type PerformanceAllowanceRecord,
  type PerformanceAllowanceSummary,
  type PaysheetStaffOption,
  type SalaryFilterOption
} from '@/types/payroll';
import PerformanceAllowanceWorkspace from './performance-allowance-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    mode?: string;
    staffId?: string;
    departmentId?: string;
    designationId?: string;
    effectiveDate?: string;
  }>;
};

function parseMode(value?: string): PerformanceAllowanceMode {
  return value === 'fixed' ? 'fixed' : 'percentage';
}

export default async function PerformanceAllowancePage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/performance-allowance');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'performance-allowance.visited',
      entityType: 'PerformanceAllowance',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const mode = parseMode(params?.mode);
  const filters = {
    mode,
    staffId: params?.staffId || undefined,
    departmentId: params?.departmentId || undefined,
    designationId: params?.designationId || undefined,
    effectiveDate: params?.effectiveDate || undefined,
    page: params?.page ? Number(params.page) : undefined,
    limit: process.env.DEFAULT_PER_PAGE
      ? Number(process.env.DEFAULT_PER_PAGE)
      : undefined
  };

  const [listRes, summaryRes, staffRes, employmentOptsRes] = await Promise.all([
    getPerformanceAllowanceListAction(filters),
    getPerformanceAllowanceSummaryAction(filters),
    getPayrollStaffOptionsAction(),
    getPayrollEmploymentFilterOptionsAction()
  ]);

  const records: PerformanceAllowanceRecord[] = listRes.isError
    ? []
    : (listRes.data ?? []);
  const totalRecords = listRes.isError ? 0 : listRes.total;
  const summary: PerformanceAllowanceSummary = summaryRes.isError
    ? EMPTY_PERFORMANCE_ALLOWANCE_SUMMARY
    : (summaryRes.data ?? EMPTY_PERFORMANCE_ALLOWANCE_SUMMARY);
  const staffOptions: PaysheetStaffOption[] = staffRes.isError
    ? []
    : (staffRes.data ?? []);

  const departmentOptions: SalaryFilterOption[] = employmentOptsRes.isError
    ? []
    : (employmentOptsRes.data?.departments ?? []);
  const designationOptions: SalaryFilterOption[] = employmentOptsRes.isError
    ? []
    : (employmentOptsRes.data?.designations ?? []);

  return (
    <PerformanceAllowanceWorkspace
      mode={mode}
      initialRecords={records}
      totalRecords={totalRecords}
      summary={summary}
      page={params?.page}
      staffOptions={staffOptions}
      departmentOptions={departmentOptions}
      designationOptions={designationOptions}
      initialFilters={{
        staffId: filters.staffId,
        departmentId: filters.departmentId,
        designationId: filters.designationId,
        effectiveDate: filters.effectiveDate
      }}
    />
  );
}
