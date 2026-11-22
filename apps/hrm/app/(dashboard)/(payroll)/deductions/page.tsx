import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getDeductionListAction,
  getDeductionSummaryAction
} from '@/app/actions/payroll-actions/deduction.actions';
import {
  EMPTY_DEDUCTION_SUMMARY,
  type DeductionRecord,
  type DeductionSummary
} from '@/types/payroll';
import DeductionsWorkspace from './deductions-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    typeId?: string;
    kind?: string;
  }>;
};

export default async function DeductionsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/deductions');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'deductions.visited',
      entityType: 'PaysheetComponent',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters = {
    search: params?.search?.trim() || undefined,
    typeId: params?.typeId || undefined,
    kind: params?.kind || undefined,
    page: params?.page ? Number(params.page) : undefined,
    limit: process.env.DEFAULT_PER_PAGE
      ? Number(process.env.DEFAULT_PER_PAGE)
      : undefined
  };

  const [listRes, summaryRes] = await Promise.all([
    getDeductionListAction(filters),
    getDeductionSummaryAction(filters)
  ]);

  const records: DeductionRecord[] = listRes.isError
    ? []
    : (listRes.data ?? []);
  const totalRecords = listRes.isError ? 0 : listRes.total;
  const summary: DeductionSummary = summaryRes.isError
    ? EMPTY_DEDUCTION_SUMMARY
    : (summaryRes.data ?? EMPTY_DEDUCTION_SUMMARY);

  return (
    <DeductionsWorkspace
      initialRecords={records}
      totalRecords={totalRecords}
      summary={summary}
      page={params?.page}
      initialFilters={{
        search: filters.search,
        typeId: filters.typeId,
        kind: filters.kind
      }}
    />
  );
}
