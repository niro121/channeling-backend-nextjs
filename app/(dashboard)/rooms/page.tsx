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
  getAllRooms,
  getRoomsExport,
  checkRoomsHaveLinkedRecords
} from '@/app/actions/room.actions';
import { RoomColumns } from './columns';
import FilterSection from './filter-section';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { ExportWrapper } from '../export-wrapper';
import { BulkDeleteButton } from '@/components/common/custom-data-table';

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

  const handleExport = async () => {
    'use server';

    const roomListResponse = await getRoomsExport({
      keyword: params?.keyword,
      locationId: params?.locationId
    });

    if (!roomListResponse.success || !roomListResponse.data?.length) {
      return {
        success: false,
        message: roomListResponse.success
          ? 'No rooms found'
          : roomListResponse.message
      };
    }

    const mappedRooms = roomListResponse.data.map((r: any) => ({
      number: r.number || '-',
      location: r.location?.name || '-',
      zone: r.zone?.name || '-'
    }));

    return {
      success: true,
      data: mappedRooms
    };
  };

  const getBulkDeleteDescription = async (ids: string[]): Promise<string> => {
    'use server';
    
    try {
      const result = await checkRoomsHaveLinkedRecords(ids);
      
      if (result.success && result.data) {
        const { hasLinkedRecords } = result.data;
        
        if (hasLinkedRecords) {
          return "One or more selected rooms are currently linked to other system records. Deleting them may affect related data and existing associations.\n\nAre you sure you want to continue?";
        }
      }
      
      // Default message if no linked records
      return "This action cannot be undone. This will permanently delete these records and remove the data from our servers.";
    } catch (error: any) {
      console.error('Error getting bulk delete description:', error);
      return "This action cannot be undone. This will permanently delete these records and remove the data from our servers.";
    }
  };

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
          getBulkDeleteDescription={getBulkDeleteDescription}
          page={params?.page}
          toolbarLeft={
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="relative w-full sm:max-w-sm">
                  <SearchInput
                    name="keyword"
                    placeholder="Search by number, zone"
                    className="pl-8 w-full h-9"
                  />
                </div>
                <FilterSection
                  locationOptions={locationOptions}
                  locationId={params?.locationId}
                />
              </div>
              <div className="flex items-center">
                <ExportWrapper
                  serverData={handleExport}
                  columns={['Room Number', 'Location', 'Zone']}
                  keys={['number', 'location', 'zone']}
                  title="Rooms List"
                  fileName="rooms"
                />
              </div>
            </div>
          }
          toolbarRight={
            <div className="flex items-start gap-2 shrink-0">
              <BulkDeleteButton />
              <Link href="/rooms/add">
                <Button size="sm" className="gap-1.5 h-9 cursor-pointer">
                  <Plus className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Add New
                  </span>
                </Button>
              </Link>
            </div>
          }
          hideAutoBulkDelete={true}
        />
      </Suspense>
    </div>
  );
}
