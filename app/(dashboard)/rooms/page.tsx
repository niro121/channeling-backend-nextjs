import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import Loading from '../loading';
import Link from 'next/link';
import {
  bulkDeleteRooms,
  getAllLocations,
  getAllRooms
} from '@/app/actions/room.actions';
import { RoomColumns } from './columns';
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
  const canView = await checkRouteAccess('/rooms');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;

  const { data, totalRecords } = await getAllRooms({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    locationId: params?.locationId
  });

  const locationRes = await getAllLocations();
  const locationOptions =
    locationRes?.data?.map((l) => ({ id: l.id as string, name: l.name })) ?? [];

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="Rooms"
          subHeading="Manage your rooms here."
          columns={RoomColumns}
          data={data}
          rowCount={totalRecords}
          deleteServerAction={bulkDeleteRooms}
          page={params?.page}
          toolbarLeft={
            <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
              <div className="relative w-full sm:max-w-sm">
                <SearchInput
                  name="keyword"
                  placeholder="Search by number, location"
                  className="pl-8 w-full h-9"
                />
              </div>
              <FilterSection
                locationOptions={locationOptions}
                locationId={params?.locationId}
              />
            </div>
          }
          toolbarRight={
            <Link href="/rooms/add">
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
