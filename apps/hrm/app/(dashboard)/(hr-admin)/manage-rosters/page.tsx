import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getManageRosterListAction } from '@/app/actions/hr-admin-actions/manage-roster.actions';
import ManageRosterWorkspace from './manage-roster-workspace';

type SearchParams = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

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

  const listRes = await getManageRosterListAction();
  const records = listRes.isError ? [] : (listRes.data ?? []);

  const params = await searchParams;
  const defaultSelected =
    params?.id && records.some((r) => r.id === params.id)
      ? params.id
      : (records[0]?.id ?? null);

  return (
    <ManageRosterWorkspace
      initialRecords={records}
      initialSelectedId={defaultSelected}
    />
  );
}
