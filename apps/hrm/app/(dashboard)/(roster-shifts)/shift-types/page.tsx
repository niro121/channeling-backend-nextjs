import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getShiftTypeSummaryAction,
  getShiftTypesAction,
  getShiftTypesExport
} from '@/app/actions/roster-actions/shift-type.actions';
import type { ShiftTypeRecord, ShiftTypeSummary } from '@/types/roster';
import ShiftTypesWorkspace from './shift-types-workspace';
import type { ShiftTypeFilterValues } from './section-shift-type-filters';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    code?: string;
    name?: string;
    category?: string;
    nightShift?: string;
    overnight?: string;
    status?: string;
  }>;
};

const EMPTY_SUMMARY: ShiftTypeSummary = {
  total: 0,
  categories: 0,
  active: 0,
  nightOrOvernight: 0,
  holidayEligible: 0
};

export default async function ShiftTypesPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/shift-types');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'shift-types.visited',
      entityType: 'ShiftType',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters: ShiftTypeFilterValues = {
    code: params?.code ?? '',
    name: params?.name ?? '',
    categoryId: params?.category ?? '',
    nightShift: params?.nightShift ?? '',
    overnight: params?.overnight ?? '',
    status: params?.status ?? ''
  };

  const listParams = {
    page: params?.page,
    limit: params?.limit,
    code: params?.code,
    name: params?.name,
    category: params?.category,
    nightShift: params?.nightShift,
    overnight: params?.overnight,
    status: params?.status
  };

  const [listRes, summaryRes] = await Promise.all([
    getShiftTypesAction(listParams),
    getShiftTypeSummaryAction()
  ]);

  const records = (
    listRes.isError ? [] : (listRes.data?.data ?? [])
  ) as ShiftTypeRecord[];
  const totalRecords = listRes.isError
    ? 0
    : (listRes.data?.totalRecords ?? 0);
  const summary = summaryRes.isError
    ? EMPTY_SUMMARY
    : (summaryRes.data ?? EMPTY_SUMMARY);

  const handleExport = async () => {
    'use server';

    const exportResponse = await getShiftTypesExport(listParams);
    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No shift types found'
          : (exportResponse.message ?? 'Failed to export shift types')
      };
    }

    return {
      success: true,
      data: exportResponse.data.map((row) => ({
        code: row.code,
        name: row.name,
        category: row.category,
        startTime: row.startTime,
        endTime: row.endTime,
        durationHours: row.durationHours,
        nightShift: row.isNightShift ? 'Yes' : 'No',
        overnight: row.isOvernight ? 'Yes' : 'No',
        holidayEligible: row.holidayEligible ? 'Yes' : 'No',
        status: row.status,
        updatedBy: row.updatedUser?.name ?? '',
        updatedAt: row.updatedAt,
        createdBy: row.createdUser?.name ?? '',
        createdAt: row.createdAt
      }))
    };
  };

  return (
    <ShiftTypesWorkspace
      records={records}
      totalRecords={totalRecords}
      page={params?.page}
      filters={filters}
      summary={summary}
      onExport={handleExport}
    />
  );
}
