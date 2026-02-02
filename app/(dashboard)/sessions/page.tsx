import React, { Suspense } from 'react';
import { CustomDataTable } from '@/components/common/custom-data-table';
// import { SessionColumns } from './columns';
import Loading from '../loading';
import FilterSection from './filter-section';
import AddBtnSection from './add-btn-section';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    doctorId?: string;
    fromDate?: string;
    toDate?: string;
  }>;
};

export default async function Page({ searchParams }: SearchParams) {
  const params = await searchParams;

  /* const { data, totalRecords } = await getAllDoctorSessions({
    page: params?.page,
    limit: params?.limit,
    doctorId: params?.doctorId,
  }); */

  // ==== DOCTOR OPTIONS ==== //
  // const doctorOptions = await getDoctorOptions();

  return (
    <>
      <div className="flex items-center ">
        <div className="ml-auto flex items-center gap-4">
          <AddBtnSection />
        </div>
      </div>
      <div className="mt-2 flex flex-col lg:flex-row gap-3 items-start">
        <FilterSection
          doctorId={params?.doctorId}
          doctorOptions={[]}
          fromDate={params?.fromDate}
          toDate={params?.toDate}
        />
      </div>
      <div className="overflow-hidden">
        <Suspense fallback={<Loading />}>
          {/* <CustomDataTable
            heading="Doctors"
            subHeading="Manage your doctors here."
            columns={DoctorColumns}
            data={data}
            rowCount={totalRecords}
            deleteServerAction={bulkDeleteDoctors}
            page={params?.page}
          /> */}
        </Suspense>
      </div>
    </>
  );
}
