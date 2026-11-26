import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getPayslipListAction,
  getPayslipSummaryAction
} from '@/app/actions/payroll-actions/payslip.actions';
import {
  getPayrollEmploymentFilterOptionsAction,
  getPayrollStaffOptionsAction
} from '@/app/actions/payroll-actions/paysheet-assignment.actions';
import {
  EMPTY_PAYSLIP_SUMMARY,
  type PaysheetStaffOption,
  type PayslipRecord,
  type PayslipSummary,
  type SalaryFilterOption
} from '@/types/payroll';
import PayslipsWorkspace from './payslips-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    salaryMonth?: string;
    salaryYear?: string;
    staffId?: string;
    staffCode?: string;
    departmentId?: string;
    designationId?: string;
    institution?: string;
    paymentStatus?: string;
  }>;
};

export default async function PayslipsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/payslips');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'payslips.visited',
      entityType: 'Payslip',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters = {
    salaryMonth: params?.salaryMonth || undefined,
    salaryYear: params?.salaryYear || undefined,
    staffId: params?.staffId || undefined,
    staffCode: params?.staffCode || undefined,
    departmentId: params?.departmentId || undefined,
    designationId: params?.designationId || undefined,
    institution: params?.institution || undefined,
    paymentStatus: params?.paymentStatus || undefined,
    page: params?.page ? Number(params.page) : undefined,
    limit: process.env.DEFAULT_PER_PAGE
      ? Number(process.env.DEFAULT_PER_PAGE)
      : undefined
  };

  const [listRes, summaryRes, staffRes, employmentOptsRes] = await Promise.all([
    getPayslipListAction(filters),
    getPayslipSummaryAction(filters),
    getPayrollStaffOptionsAction(),
    getPayrollEmploymentFilterOptionsAction()
  ]);

  const records: PayslipRecord[] = listRes.isError ? [] : (listRes.data ?? []);
  const totalRecords = listRes.isError ? 0 : listRes.total;
  const summary: PayslipSummary = summaryRes.isError
    ? EMPTY_PAYSLIP_SUMMARY
    : (summaryRes.data ?? EMPTY_PAYSLIP_SUMMARY);
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
    <PayslipsWorkspace
      initialRecords={records}
      totalRecords={totalRecords}
      summary={summary}
      page={params?.page}
      staffOptions={staffOptions}
      departmentOptions={departmentOptions}
      designationOptions={designationOptions}
      initialFilters={{
        salaryMonth: filters.salaryMonth,
        salaryYear: filters.salaryYear,
        staffId: filters.staffId,
        staffCode: filters.staffCode,
        departmentId: filters.departmentId,
        designationId: filters.designationId,
        institution: filters.institution,
        paymentStatus: filters.paymentStatus
      }}
    />
  );
}
