import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { DoctorColumns } from './columns';
import Loading from '../loading';
import Link from 'next/link';
import {
  bulkDeleteDoctors,
  getAllDoctors,
  getAllSpecialityOptions,
  checkDoctorsHaveActiveSessionsOrLeaves
} from '@/app/actions/doctor.actions';
import { getDoctorsExport } from '@/app/actions/doctor.actions';
import { ExportWrapper } from '../export-wrapper';
import FilterSection from './filter-section';
import { checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { redirect } from 'next/navigation';
import { BulkDeleteButton } from '@/components/common/custom-data-table';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    specialityId?: string;
  }>;
};

export default async function Page({ searchParams }: SearchParams) {
  // Check if user can view doctors
  const canView = await checkRouteAccess('/doctors');
  if (!canView) {
    redirect('/unauthorized-access');
  }
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'doctors.visited',
      entityType: 'Doctors',
      importance: 'low',
    });
  }

  const params = await searchParams;

  const { data, totalRecords } = await getAllDoctors({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    specialityId: params?.specialityId
  });

  const specialityRes = await getAllSpecialityOptions();
  const specialityOptions =
    specialityRes?.data
      ?.map((s) => ({ id: s.id as string, name: s.name }))
      .sort((a, b) => a.name.localeCompare(b.name)) ?? [];

  const handleExport = async () => {
    'use server';

    const doctorListResponse = await getDoctorsExport({
      keyword: params?.keyword,
      specialityId: params?.specialityId
    });

    if (!doctorListResponse.success || !doctorListResponse.data?.length) {
      return {
        success: false,
        message: doctorListResponse.success
          ? 'No doctors found'
          : doctorListResponse.message
      };
    }

    const mappedDoctors = doctorListResponse.data.map((d) => ({
      name: d.name,
      code: d.code,
      registrationNumber: d.registrationNumber,
      speciality: d.speciality?.name || '-'
    }));

    return {
      success: true,
      data: mappedDoctors
    };
  };

  const getBulkDeleteDescription = async (ids: string[]): Promise<string> => {
    'use server';
    
    try {
      const result = await checkDoctorsHaveActiveSessionsOrLeaves(ids);
      
      if (result.success && result.data) {
        const { hasActiveSessions, hasApprovedLeaves } = result.data;
        
        if (hasActiveSessions || hasApprovedLeaves) {
          return "One or more selected doctors have active sessions and/or approved leave records. Deleting them may affect scheduled appointments and availability records.\n\nAre you sure you want to continue?";
        }
      }
      
      // Default message if no active sessions or leaves
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
          heading="Doctors"
          subHeading="Manage your doctors here."
          columns={DoctorColumns}
          data={data}
          rowCount={totalRecords}
          deleteServerAction={bulkDeleteDoctors}
          getBulkDeleteDescription={getBulkDeleteDescription}
          page={params?.page}
          toolbarLeft={
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="relative w-full sm:max-w-sm">
                  <SearchInput
                    name="keyword"
                    placeholder="Search by name, code, registration number"
                    className="pl-8 w-full h-9"
                  />
                </div>
                <FilterSection
                  specialityOptions={specialityOptions}
                  specialityId={params?.specialityId}
                />
              </div>
              <div className="flex items-center">
                <ExportWrapper
                  serverData={handleExport}
                  columns={['Code','Name', 'Speciality','Registration Number']}
                  keys={['code', 'name', 'speciality', 'registrationNumber' ]}
                  title="Doctors List"
                  fileName="doctors"
                />
              </div>
            </div>
          }
          toolbarRight={
            <div className="flex items-start gap-2 shrink-0">
              <BulkDeleteButton />
              <Link href="/doctors/add">
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
