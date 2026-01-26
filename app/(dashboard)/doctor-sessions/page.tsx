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
import {
  getDoctorOptions,
  getLocationOptions
} from '@/app/actions/doctor.sessions.action';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    locationId?: string;
    doctorId?: string;
  }>;
};

export default async function Page({ searchParams }: SearchParams) {
  const params = await searchParams;

  /* const { data, totalRecords } = await getAllDoctors({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    locationId: params?.locationId,

  }); */

  // ==== LOCATION OPTIONS ==== //
  const locationOptions = await getLocationOptions();

  // ==== DOCTOR OPTIONS ==== //
  const doctorOptions = await getDoctorOptions();

  return (
    <>
      <div className="mt-2 flex flex-col lg:flex-row gap-3 items-start">
        <FilterSection
          locationId={params?.locationId}
          locationOptions={locationOptions.data || []}
          doctorId={params?.doctorId}
          doctorOptions={doctorOptions.data || []}
        />
      </div>
      <div className="overflow-hidden">
        <Suspense fallback={<Loading />}>
          <CustomDataTable
            heading="Doctor Sessions"
            subHeading="Manage your doctor sessions here."
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
