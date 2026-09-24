import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getDesignationListAction } from '@/app/actions/hr-admin-actions/designation.actions';
import DesignationWorkspace from './designation-workspace';

type SearchParams = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function DesignationsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/designations');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'designations.visited',
      entityType: 'Designation',
      importance: 'low'
    });
  }

  const listRes = await getDesignationListAction();
  const records = listRes.isError ? [] : (listRes.data ?? []);

  const params = await searchParams;
  const defaultSelected =
    params?.id && records.some((r) => r.id === params.id)
      ? params.id
      : (records[0]?.id ?? null);

  return (
    <DesignationWorkspace
      initialRecords={records}
      initialSelectedId={defaultSelected}
    />
  );
}
