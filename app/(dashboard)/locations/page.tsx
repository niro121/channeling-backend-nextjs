import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { LocationColumns } from './columns';
import Loading from '../loading';
import Link from 'next/link';
import { bulkDeleteLocations, getAllLocations, getLocationsExport, checkLocationsHaveLinkedRecords } from '@/app/actions/location.action';
import { LOCATION_OPTIONS } from '@/types/location';
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

  const handleExport = async () => {
    'use server';

    const locationListResponse = await getLocationsExport({
      keyword: params?.keyword,
      locationId: params?.locationId
    });

    if (!locationListResponse.success || !locationListResponse.data?.length) {
      return {
        success: false,
        message: locationListResponse.success
          ? 'No locations found'
          : locationListResponse.message
      };
    }

    const mappedLocations = locationListResponse.data.map((l: any) => ({
      code: l.code || '-',
      name: l.name || '-',
      type: LOCATION_OPTIONS.find(opt => String(l.branchType) === opt.id)?.name || '-',
      address: [l.addressLine1, l.addressLine2, l.city].filter(Boolean).join(', ') || '-'
    }));

    return {
      success: true,
      data: mappedLocations
    };
  };

  const getBulkDeleteDescription = async (ids: string[]): Promise<string> => {
    'use server';
    
    try {
      const result = await checkLocationsHaveLinkedRecords(ids);
      
      if (result.success && result.data) {
        const { hasLinkedRecords } = result.data;
        
        if (hasLinkedRecords) {
          return "One or more selected locations are currently linked to other system records. Deleting them may affect related data and existing associations.\n\nAre you sure you want to continue?";
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
          heading="Locations"
          subHeading="Manage your locations here."
          columns={LocationColumns}
          data={data}
          rowCount={totalRecords}
          deleteServerAction={bulkDeleteLocations}
          getBulkDeleteDescription={getBulkDeleteDescription}
          page={params?.page}
          toolbarLeft={
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row gap-3 items-start">
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
              <div className="flex items-center">
                <ExportWrapper
                  serverData={handleExport}
                  columns={['Code', 'Name', 'Type', 'Address']}
                  keys={['code', 'name', 'type', 'address']}
                  title="Locations List"
                  fileName="locations"
                />
              </div>
            </div>
          }
          toolbarRight={
            <div className="flex items-start gap-2 shrink-0">
              <BulkDeleteButton />
              <Link href="/locations/add">
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
