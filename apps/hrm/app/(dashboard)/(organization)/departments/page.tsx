import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getDepartmentListAction } from '@/app/actions/organization-actions/department.actions';
import DepartmentWorkspace from './department-workspace';

type SearchParams = {
  searchParams?: Promise<{
    id?: string;
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
  const defaultSelected =
    params?.id && records.some((r) => r.id === params.id)
      ? params.id
      : (records[0]?.id ?? null);

  return (
    <DepartmentWorkspace
      initialRecords={records}
      initialSelectedId={defaultSelected}
    />
  );
}
