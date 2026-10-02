import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getLocationListAction } from '@/app/actions/organization-actions/location.actions';
import LocationWorkspace from './location-workspace';

type SearchParams = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function LocationsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/locations');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'organizations.locations.visited',
      entityType: 'Location',
      importance: 'low'
    });
  }

  const listRes = await getLocationListAction();
  const records = listRes.isError ? [] : (listRes.data ?? []);

  const params = await searchParams;
  const defaultSelected =
    params?.id && records.some((r) => r.id === params.id)
      ? params.id
      : (records[0]?.id ?? null);

  return (
    <LocationWorkspace
      initialRecords={records}
      initialSelectedId={defaultSelected}
    />
  );
}
