import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from '@/components/icons';
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
  // Check if user can view rooms
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

  // ==== GET LOCATION LIST ==== //
  const locationRes = await getAllLocations();

  const locationOptions =
    locationRes?.data?.map((l) => ({ id: l.id as string, name: l.name })) ?? [];

  return (
    <>
      <div className="flex items-center ">
        <div className="ml-auto flex items-center gap-4">
          <div className="lg:block hidden relative flex-1 md:grow-0">
            <SearchInput
              name="keyword"
              placeholder={'Search by name, code, registration number'}
              className={'rounded-lg bg-background pl-8 w-full sm:w-auto'}
            />
          </div>
          <Link href="/rooms/add">
            <Button
              size="sm"
              className="gap-1 px-8 text-white transition-colors ease-in-out duration-100 hover:text-black"
            >
              <PlusCircle />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Add New
              </span>
            </Button>
          </Link>
        </div>
      </div>
      <div className="mt-2 flex flex-col lg:flex-row gap-3 items-start">
        <div className="lg:hidden relative flex-1 md:grow-0">
          <SearchInput
            name="keyword"
            placeholder={'Search by number, location'}
            className={'rounded-lg bg-background pl-8 w-full'}
          />
        </div>
        <FilterSection
          locationOptions={locationOptions}
          locationId={params?.locationId}
        />
      </div>
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
          />
        </Suspense>
      </div>
    </>
  );
}
