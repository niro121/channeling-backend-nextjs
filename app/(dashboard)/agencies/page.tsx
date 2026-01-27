import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from '@/components/icons';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { AgencyColumns } from './columns';
import Loading from '../loading';
import Link from 'next/link';
import {
  bulkDeleteAgencies,
  getAllAgencies,
  getAgenciesExport
} from '@/app/actions/agency.actions';
import { ExportWrapper } from '../export-wrapper';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
  }>;
};

export default async function Page({ searchParams }: SearchParams) {
  const params = await searchParams;

  const { data, totalRecords } = await getAllAgencies({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword
  });

  // ==== EXPORT: GET AGENCY LIST ==== //
  const handleExport = async () => {
    'use server';

    const agencyListResponse = await getAgenciesExport({
      keyword: params?.keyword
    });

    if (!agencyListResponse.success || !agencyListResponse.data?.length) {
      return {
        success: false,
        message: agencyListResponse.success
          ? 'No agencies found'
          : agencyListResponse.message
      };
    }

    const mappedAgencies = agencyListResponse.data.map((a) => ({
      code: a.code || '-',
      name: a.name,
      chequePrintingName: a.chequePrintingName,
      parentAgency: a.parentAgency?.name || '-',
      email: a.email || '-',
      phone: a.phone || '-',
      balance: a.balance?.toFixed(2) || '0.00'
    }));

    return {
      success: true,
      data: mappedAgencies
    };
  };

  return (
    <>
      <div className="flex items-center ">
        <div className="ml-auto flex items-center gap-4">
          <div className="lg:block hidden relative flex-1 md:grow-0">
            <SearchInput
              name="keyword"
              placeholder={'Search by name, code, email, phone'}
              className={'rounded-lg bg-background pl-8 w-full sm:w-auto'}
            />
          </div>
          <Link href="/agencies/add">
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
            placeholder={'Search by name, code, email, phone'}
            className={'rounded-lg bg-background pl-8 w-full'}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <ExportWrapper
            serverData={handleExport}
            columns={[
              'Code',
              'Name',
              'Cheque Printing Name',
              'Parent Agency',
              'Email',
              'Phone',
              'Balance'
            ]}
            keys={[
              'code',
              'name',
              'chequePrintingName',
              'parentAgency',
              'email',
              'phone',
              'balance'
            ]}
            title="Agencies List"
            fileName="agencies"
          />
        </div>
      </div>
      <div className="overflow-hidden">
        <Suspense fallback={<Loading />}>
          <CustomDataTable
            heading="Agencies"
            subHeading="Manage your agencies here."
            columns={AgencyColumns}
            data={data}
            rowCount={totalRecords}
            deleteServerAction={bulkDeleteAgencies}
            page={params?.page}
          />
        </Suspense>
      </div>
    </>
  );
}
