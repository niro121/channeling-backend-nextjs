import React, { Suspense } from 'react';
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
  getAllSpecialityOptions
} from '@/app/actions/doctor.actions';
import { getDoctorsExport } from '@/app/actions/doctor.actions';
import { ExportWrapper } from '../export-wrapper';
import FilterSection from './filter-section';
import { checkRouteAccess } from '@/lib/server-permissions';
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

  const params = await searchParams;

  const { data, totalRecords } = await getAllDoctors({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    specialityId: params?.specialityId
  });

  const specialityRes = await getAllSpecialityOptions();
  const specialityOptions =
    specialityRes?.data?.map((s) => ({ id: s.id as string, name: s.name })) ??
    [];

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
                  columns={['Name', 'Code', 'Registration Number', 'Speciality']}
                  keys={['name', 'code', 'registrationNumber', 'speciality']}
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
