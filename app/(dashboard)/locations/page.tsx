import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { LocationColumns } from './columns';
import Loading from '../loading';
import Link from 'next/link';
import { bulkDeleteLocations, getAllLocations } from '@/app/actions/location.action';
import { LOCATION_OPTIONS } from '@/types/location';
import FilterSection from './filter-section';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    locationId?: string;
  }>;
};

export default async function Page({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/locations');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;

  const { data, totalRecords } = await getAllLocations({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    locationId: params?.locationId
  });

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="Locations"
          subHeading="Manage your locations here."
          columns={LocationColumns}
          data={data}
          rowCount={totalRecords}
          deleteServerAction={bulkDeleteLocations}
          page={params?.page}
          toolbarLeft={
            <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
              <div className="relative w-full sm:max-w-sm">
                <SearchInput
                  name="keyword"
                  placeholder="Search by name, city or code"
                  className="pl-8 w-full h-9"
                />
              </div>
              <FilterSection
                locationTypeOptions={LOCATION_OPTIONS}
                locationId={params?.locationId}
              />
            </div>
          }
          toolbarRight={
            <Link href="/locations/add">
              <Button size="sm" className="gap-1.5 h-9">
                <Plus className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add New
                </span>
              </Button>
            </Link>
          }
        />
      </Suspense>
    </div>
  );
}
