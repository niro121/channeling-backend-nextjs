import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getDepartmentListAction } from '@/app/actions/organization-actions/department.actions';
import { INSTITUTION_OPTIONS } from '@/types/institution';
import { DEPARTMENT_STATUS_OPTIONS } from '@/types/department';
import DepartmentWorkspace from './department-workspace';
import type { DepartmentListFilters } from './section-department-filters';

type SearchParams = {
  searchParams?: Promise<{
    id?: string;
    search?: string;
    institution?: string;
    status?: string;
  }>;
};

export default async function DepartmentsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/departments');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'organizations.departments.visited',
      entityType: 'Department',
      importance: 'low'
    });
  }

  const listRes = await getDepartmentListAction();
  const records = listRes.isError ? [] : (listRes.data ?? []);

  const params = await searchParams;

  const institutionIds = new Set(INSTITUTION_OPTIONS.map((opt) => opt.id));
  const statusIds = new Set(
    DEPARTMENT_STATUS_OPTIONS.map((opt) => opt.id as string)
  );

  const initialFilters: DepartmentListFilters = {
    search: params?.search?.trim() || undefined,
    institution:
      params?.institution && institutionIds.has(params.institution)
        ? params.institution
        : undefined,
    status:
      params?.status && statusIds.has(params.status) ? params.status : undefined
  };

  const defaultSelected =
    params?.id && records.some((r) => r.id === params.id)
      ? params.id
      : (records[0]?.id ?? null);

  return (
    <DepartmentWorkspace
      initialRecords={records}
      initialSelectedId={defaultSelected}
      initialFilters={initialFilters}
    />
  );
}
