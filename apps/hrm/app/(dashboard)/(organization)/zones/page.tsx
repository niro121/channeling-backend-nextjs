import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import {
  getLinkedLocationOptionsAction,
  getZoneListAction
} from '@/app/actions/organization-actions/zone.actions';
import ZoneWorkspace from './zone-workspace';

type SearchParams = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function ZonesPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/zones');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'organizations.zones.visited',
      entityType: 'Zone',
      importance: 'low'
    });
  }

  const [listRes, locationsRes] = await Promise.all([
    getZoneListAction(),
    getLinkedLocationOptionsAction()
  ]);
  const records = listRes.isError ? [] : (listRes.data ?? []);
  const locationOptions = locationsRes.isError
    ? []
    : (locationsRes.data ?? []);

  const params = await searchParams;
  const defaultSelected =
    params?.id && records.some((r) => r.id === params.id)
      ? params.id
      : (records[0]?.id ?? null);

  return (
    <ZoneWorkspace
      initialRecords={records}
      locationOptions={locationOptions}
      initialSelectedId={defaultSelected}
    />
  );
}
