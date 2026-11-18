import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getManageRosterListAction } from '@/app/actions/hr-admin-actions/manage-roster.actions';
import { getDepartmentOptionsAction } from '@/app/actions/organization-actions/department.actions';
import type { ManageRosterWorkspaceTab } from '@/types/manage-roster';
import { staffRosterFiltersFromSearchParams } from '@/types/manage-roster';
import ManageRosterWorkspace from './manage-roster-workspace';

type SearchParams = {
  searchParams?: Promise<{
    id?: string;
    tab?: string;
    rosterId?: string;
    staffId?: string;
    departmentId?: string;
    status?: string;
  }>;
};

function parseInitialTab(value?: string): ManageRosterWorkspaceTab {
  return value === 'staff' ? 'staff' : 'rosters';
}

export default async function ManageRostersPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/manage-rosters');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'manage-rosters.visited',
      entityType: 'ManageRoster',
      importance: 'low'
    });
  }

  const [listRes, departmentRes] = await Promise.all([
    getManageRosterListAction(),
    getDepartmentOptionsAction()
  ]);
  const records = listRes.isError ? [] : (listRes.data ?? []);
  const departmentOptions = departmentRes.isError
    ? []
    : (departmentRes.data ?? []);

  const params = await searchParams;
  const initialStaffFilters = staffRosterFiltersFromSearchParams({
    rosterId: params?.rosterId,
    staffId: params?.staffId,
    departmentId: params?.departmentId,
    status: params?.status,
    id: params?.id
  });

  const defaultSelected =
    (params?.rosterId && records.some((r) => r.id === params.rosterId)
      ? params.rosterId
      : null) ??
    (params?.id && records.some((r) => r.id === params.id) ? params.id : null) ??
    records[0]?.id ??
    null;

  return (
    <ManageRosterWorkspace
      initialRecords={records}
      initialSelectedId={defaultSelected}
      initialTab={parseInitialTab(params?.tab)}
      initialStaffFilters={initialStaffFilters}
      departmentOptions={departmentOptions}
    />
  );
}
