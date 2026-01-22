import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from '@/components/icons';
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

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    locationId?: string;
    doctorId?: string;
  }>;
};

export default async function Page({ searchParams }: SearchParams) {
  const params = await searchParams;

  const { data, totalRecords } = await getAllDoctors({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    location
  });

  return (
    <>
      <div className="flex items-center ">
        <div className="ml-auto flex items-center gap-4">
          <div className="lg:block hidden relative flex-1 md:grow-0">
            <SearchInput
              name="keyword"
              placeholder={'Search by doctor name'}
              className={'rounded-lg bg-background pl-8 w-full sm:w-auto'}
            />
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-col lg:flex-row gap-3 items-start">
        <div className="lg:hidden relative flex-1 md:grow-0">
          <SearchInput
            name="keyword"
            placeholder={'Search by doctor name'}
            className={'rounded-lg bg-background pl-8 w-full'}
          />
        </div>
        <FilterSection
          specialityOptions={specialityOptions}
          specialityId={params?.specialityId}
        />
        <div className="flex items-center gap-2 ml-auto">
          <ExportWrapper
            serverData={handleExport}
            columns={['Name', 'Code', 'Registration Number', 'Speciality']}
            keys={['name', 'code', 'registrationNumber', 'speciality']}
            title="Doctors List"
            fileName="doctors"
          />
        </div>
      </div>
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
          />
        </Suspense>
      </div>
    </>
  );
}
