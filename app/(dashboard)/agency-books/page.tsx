import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from '@/components/icons';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { AgencyBookColumns } from './columns';
import Loading from '../loading';
import Link from 'next/link';
import {
  bulkDeleteAgencyBooks,
  getAllAgencyBooks
} from '@/app/actions/agencybook.actions';
import { getAllAgenciesOptions } from '@/app/actions/agency.actions';
import FilterSection from './filter-section';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    agencyId?: string;
  }>;
};

export default async function Page({ searchParams }: SearchParams) {
  // Check if user can view agency-books
  const canView = await checkRouteAccess('/agency-books');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;

  const { data, totalRecords } = await getAllAgencyBooks({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    agencyId: params?.agencyId
  });

  // ==== GET AGENCIES FOR FILTER ==== //
  const agenciesRes = await getAllAgenciesOptions();
  const agencyOptions =
    agenciesRes?.data?.map((a) => ({ id: a.id as string, name: a.name })) ??
    [];

  return (
    <>
      <div className="flex items-center ">
        <div className="ml-auto flex items-center gap-4">
          <div className="lg:block hidden relative flex-1 md:grow-0">
            <SearchInput
              name="keyword"
              placeholder={'Search by book number, start number, end number'}
              className={'rounded-lg bg-background pl-8 w-full sm:w-auto'}
            />
          </div>
          <Link href="/agency-books/add">
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
            placeholder={'Search by book number, start number, end number'}
            className={'rounded-lg bg-background pl-8 w-full'}
          />
        </div>
        <FilterSection
          agencyOptions={agencyOptions}
          agencyId={params?.agencyId}
        />
      </div>
      <div className="overflow-hidden">
        <Suspense fallback={<Loading />}>
          <CustomDataTable
            heading="Agency Books"
            subHeading="Manage your agency books here."
            columns={AgencyBookColumns}
            data={data}
            rowCount={totalRecords}
            deleteServerAction={bulkDeleteAgencyBooks}
            page={params?.page}
          />
        </Suspense>
      </div>
    </>
  );
}

