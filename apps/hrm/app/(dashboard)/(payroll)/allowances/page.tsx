import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getAllowanceListAction,
  getAllowanceSummaryAction
} from '@/app/actions/payroll-actions/allowance.actions';
import {
  EMPTY_ALLOWANCE_SUMMARY,
  type AllowanceRecord,
  type AllowanceSummary
} from '@/types/payroll';
import AllowancesWorkspace from './allowances-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    typeId?: string;
    kind?: string;
  }>;
};

export default async function AllowancesPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/allowances');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'allowances.visited',
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
    getAllowanceListAction(filters),
    getAllowanceSummaryAction(filters)
  ]);

  const records: AllowanceRecord[] = listRes.isError
    ? []
    : (listRes.data ?? []);
  const totalRecords = listRes.isError ? 0 : listRes.total;
  const summary: AllowanceSummary = summaryRes.isError
    ? EMPTY_ALLOWANCE_SUMMARY
    : (summaryRes.data ?? EMPTY_ALLOWANCE_SUMMARY);

  return (
    <AllowancesWorkspace
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
