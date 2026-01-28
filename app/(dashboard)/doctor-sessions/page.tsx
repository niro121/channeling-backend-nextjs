import React, { Suspense } from 'react';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { DoctorSessionColumns } from './columns';
import Loading from '../loading';
import FilterSection from './filter-section';
import {
  getAllDoctorSessions,
  getDoctorOptions,
  getLocationOptions,
  bulkDeleteDoctorSessions
} from '@/app/actions/doctor.sessions.action';
import AddBtnSection from './add-btn-section';

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

  const { data, totalRecords } = await getAllDoctorSessions({
    page: params?.page,
    limit: params?.limit,
    locationId: params?.locationId,
    doctorId: params?.doctorId
  });

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
        <div className="ml-auto flex items-center gap-4">
          <AddBtnSection />
        </div>
      </div>
      <div className="overflow-hidden">
        <Suspense fallback={<Loading />}>
          <CustomDataTable
            heading="Doctor Sessions"
            subHeading="Manage your doctor sessions here."
            columns={DoctorSessionColumns}
            data={data}
            rowCount={totalRecords}
            deleteServerAction={bulkDeleteDoctorSessions}
            page={params?.page}
          />
        </Suspense>
      </div>
    </>
  );
}
