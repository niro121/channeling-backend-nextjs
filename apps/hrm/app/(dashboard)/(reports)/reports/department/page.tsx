import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import {
  getDepartmentReportAction,
  getDepartmentReportExportAction,
  logDepartmentReportVisitAction
} from '@/app/actions/report-actions/department-reports.actions';
import {
  EMPTY_DEPARTMENT_FILTER_OPTIONS,
  EMPTY_DEPARTMENT_REPORT_CARDS
} from '@/types/reports';
import DepartmentReportsWorkspace from './department-reports-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    fromDate?: string;
    toDate?: string;
    institution?: string;
    departmentId?: string;
    keyword?: string;
    category?: string;
  }>;
};

export default async function DepartmentReportsPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/reports/department');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  void logDepartmentReportVisitAction();

  const params = await searchParams;
  const listParams = {
    page: params?.page,
    limit: params?.limit,
    fromDate: params?.fromDate,
    toDate: params?.toDate,
    institution: params?.institution,
    departmentId: params?.departmentId,
    keyword: params?.keyword,
    category: params?.category
  };

  const result = await getDepartmentReportAction(listParams);
  const data = result.isError ? null : result.data;

  const handleExport = async () => {
    'use server';

    const exportResponse = await getDepartmentReportExportAction(listParams);
    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.message ?? 'No department report to export'
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
          'Unable to load department report.'}
      </div>
    );
  }

  return (
    <DepartmentReportsWorkspace
      fromDate={data.fromDate}
      toDate={data.toDate}
      periodLabel={data.periodLabel}
      cards={data.cards ?? EMPTY_DEPARTMENT_REPORT_CARDS}
      staffByDepartment={data.staffByDepartment ?? []}
      payrollByDepartment={data.payrollByDepartment ?? []}
      rows={data.rows}
      totalRecords={data.totalRecords}
      page={params?.page}
      category={params?.category}
      keyword={params?.keyword}
      filterOptions={data.filterOptions ?? EMPTY_DEPARTMENT_FILTER_OPTIONS}
      initialFilters={{
        fromDate: params?.fromDate ?? data.fromDate,
        toDate: params?.toDate ?? data.toDate,
        institution: params?.institution,
        departmentId: params?.departmentId
      }}
      onExport={handleExport}
    />
  );
}
