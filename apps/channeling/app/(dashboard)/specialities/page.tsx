import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { SpecialityColumns } from './columns';
import Loading from '../loading';
import Link from 'next/link';
import { bulkDeleteSpecialities, getAllSpecialities, getSpecialitiesExport, getTotalDoctorCountBySpecialityIds } from '@/app/actions/speciality.actions';
import { checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { redirect } from 'next/navigation';
import { ExportWrapper } from '../export-wrapper';
import moment from 'moment';
import { NavLoadingButton } from '@/components/common/nav-loading-button';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
  }>;
};

export default async function Page({ searchParams }: SearchParams) {
  // Check if user can view specialities
  const canView = await checkRouteAccess('/specialities');
  if (!canView) {
    redirect('/unauthorized-access');
  }
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'specialities.visited',
      entityType: 'Specialities',
      importance: 'low',
    });
  }

  const params = await searchParams;

  const { data, totalRecords } = await getAllSpecialities({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
  });

  const handleExport = async () => {
    'use server';

    const specialityListResponse = await getSpecialitiesExport(params?.keyword);

    if (!specialityListResponse.success || !specialityListResponse.data?.length) {
      return {
        success: false,
        message: specialityListResponse.success
          ? 'No specialities found'
          : specialityListResponse.message
      };
    }

    const mappedSpecialities = specialityListResponse.data.map((s) => ({
      code: s.code || '-',
      name: s.name || '-',
      description: s.description || '-',
      updatedBy: s.updatedUser?.name || '-',
      updatedDate: s.updatedAt ? moment(s.updatedAt).format('DD/MM/YYYY hh:mm A') : '-',
      createdBy: s.createdUser?.name || '-',
      createdDate: s.createdAt ? moment(s.createdAt).format('DD/MM/YYYY hh:mm A') : '-',
      published: s.status === 1 ? 'Published' : 'Unpublished'
    }));

    return {
      success: true,
      data: mappedSpecialities
    };
  };

  const getBulkDeleteDescription = async (ids: string[]): Promise<string> => {
    'use server';
    
    try {
      const result = await getTotalDoctorCountBySpecialityIds(ids);
      
      if (result.success && result.data !== undefined) {
        const doctorCount = result.data;
        
        if (doctorCount > 0) {
          // Format count with leading zero if less than 10
          const formattedCount = doctorCount < 10 ? `0${doctorCount}` : `${doctorCount}`;
          return `One or more of the selected specialties are assigned to ${formattedCount} doctor(s). If you proceed, the association will be removed from all related records, and the affected doctor profiles must be updated separately.\n\nAre you sure you want to continue?`;
        }
      }
      
      // Default message if no doctors are linked
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
          heading="Specialities"
          subHeading="Manage your specialities here."
          columns={SpecialityColumns}
          data={data}
          rowCount={totalRecords}
          deleteServerAction={bulkDeleteSpecialities}
          getBulkDeleteDescription={getBulkDeleteDescription}
          page={params?.page}
          toolbarLeft={
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="relative w-full sm:max-w-sm">
                <SearchInput
                  name="keyword"
                  placeholder="Search by name, code"
                  className="pl-8 w-full h-9"
                />
              </div>
              <ExportWrapper
                serverData={handleExport}
                columns={[
                  'Code',
                  'Name',
                  'Description'
                ]}
                keys={[
                  'code',
                  'name',
                  'description'
                ]}
                title="Specialities List"
                fileName="specialities"
              />
            </div>
          }
          toolbarRight={
            <div className="flex items-center gap-2 shrink-0">
              <NavLoadingButton
                href="/specialities/add"
                size="sm"
                className="gap-1.5 h-9 cursor-pointer"
                icon={<Plus className="h-4 w-4" />}
              >
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add New
                </span>
              </NavLoadingButton>
            </div>
          }
        />
      </Suspense>
    </div>
  );
}
