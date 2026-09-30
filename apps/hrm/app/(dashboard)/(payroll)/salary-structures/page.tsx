import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getPaysheetComponentOptionsAction } from '@/app/actions/hr-admin-actions/paysheet-component.actions';
import {
  getSalaryStructureListAction,
  getSalaryStructureOptionsAction,
  getSalaryStructureSummaryAction
} from '@/app/actions/payroll-actions/salary-structure.actions';
import {
  EMPTY_SALARY_STRUCTURE_SUMMARY,
  type SalaryFilterOption,
  type SalaryStructureRecord,
  type SalaryStructureSummary
} from '@/types/payroll';
import type { PaysheetComponentOption } from '@/types/paysheet-component';
import SalaryStructuresWorkspace from './salary-structures-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    institution?: string;
    departmentId?: string;
    staffCategory?: string;
    designationId?: string;
    structureId?: string;
    status?: string;
    effectiveDate?: string;
  }>;
};

export default async function SalaryStructuresPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/salary-structures');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'salary-structures.visited',
      entityType: 'SalaryStructure',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters = {
    search: params?.search?.trim() || undefined,
    institution: params?.institution || undefined,
    departmentId: params?.departmentId || undefined,
    staffCategory: params?.staffCategory || undefined,
    designationId: params?.designationId || undefined,
    structureId: params?.structureId || undefined,
    status: params?.status || undefined,
    effectiveDate: params?.effectiveDate || undefined,
    page: params?.page ? Number(params.page) : undefined,
    limit: process.env.DEFAULT_PER_PAGE
      ? Number(process.env.DEFAULT_PER_PAGE)
      : undefined
  };

  const [listRes, summaryRes, optionsRes, componentRes] = await Promise.all([
    getSalaryStructureListAction(filters),
    getSalaryStructureSummaryAction(filters),
    getSalaryStructureOptionsAction(),
    getPaysheetComponentOptionsAction()
  ]);

  const records: SalaryStructureRecord[] = listRes.isError
    ? []
    : (listRes.data ?? []);
  const totalRecords = listRes.isError ? 0 : listRes.total;
  const summary: SalaryStructureSummary = summaryRes.isError
    ? EMPTY_SALARY_STRUCTURE_SUMMARY
    : (summaryRes.data ?? EMPTY_SALARY_STRUCTURE_SUMMARY);
  const structureOptions: SalaryFilterOption[] = optionsRes.isError
    ? []
    : (optionsRes.data ?? []);
  const componentOptions: PaysheetComponentOption[] = componentRes.isError
    ? []
    : (componentRes.data ?? []);

  return (
    <SalaryStructuresWorkspace
      initialRecords={records}
      totalRecords={totalRecords}
      summary={summary}
      structureOptions={structureOptions}
      componentOptions={componentOptions}
      page={params?.page}
    />
  );
}
