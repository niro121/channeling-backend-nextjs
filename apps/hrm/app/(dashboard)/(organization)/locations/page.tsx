import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getLocationListAction } from '@/app/actions/organization-actions/location.actions';
import {
  BRANCH_TYPE_OPTIONS,
  LOCATION_STATUS_OPTIONS
} from '@/types/location';
import LocationWorkspace from './location-workspace';
import type { LocationListFilters } from './section-location-filters';

type SearchParams = {
  searchParams?: Promise<{
    id?: string;
    search?: string;
    branchType?: string;
    status?: string;
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

  const branchTypeIds = new Set(
    BRANCH_TYPE_OPTIONS.map((opt) => opt.id as string)
  );
  const statusIds = new Set(
    LOCATION_STATUS_OPTIONS.map((opt) => opt.id as string)
  );

  const initialFilters: LocationListFilters = {
    search: params?.search?.trim() || undefined,
    branchType:
      params?.branchType && branchTypeIds.has(params.branchType)
        ? params.branchType
        : undefined,
    status:
      params?.status && statusIds.has(params.status) ? params.status : undefined
  };

  const defaultSelected =
    params?.id && records.some((r) => r.id === params.id)
      ? params.id
      : (records[0]?.id ?? null);

  return (
    <LocationWorkspace
      initialRecords={records}
      initialSelectedId={defaultSelected}
      initialFilters={initialFilters}
    />
  );
}
