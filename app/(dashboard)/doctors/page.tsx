import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from '@/components/icons';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { DoctorColumns } from './columns';
import Loading from '../loading';
import Link from 'next/link';
import { bulkDeleteDoctors, getAllDoctors } from '@/app/actions/doctor.actions';
import { getAllSpecialities } from '@/app/actions/speciality.actions';
import { SelectorFilter } from '@/components/common/selector-filter';
import { getDoctorsExport } from '@/app/actions/doctor.actions';
import { ExportWrapper } from '../export-wrapper';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    specialityId?: string;
  }>;
};

export default async function Page({ searchParams }: SearchParams) {
  const params = await searchParams;

  const { data, totalRecords } = await getAllDoctors({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    specialityId: params?.specialityId
  });

  // ==== GET SPECIALITY LIST ==== //
  const specialityRes = await getAllSpecialities({
    page: params?.page,
    limit: params?.limit,
    keyword: ''
  });

  const specialityOptions =
    specialityRes?.data?.map((s) => ({ id: s.id as string, name: s.name })) ??
    [];

  // ==== EXPORT: GET DOCTOR LIST ==== //
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
          <Link href="/doctors/add">
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
            placeholder={'Search by name, code, registration number'}
            className={'rounded-lg bg-background pl-8 w-full'}
          />
        </div>
        <SelectorFilter
          label="All Specialities"
          options={specialityOptions}
          defaultValue="__all__"
          keyword="specialityId"
          initialId={params?.specialityId}
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
