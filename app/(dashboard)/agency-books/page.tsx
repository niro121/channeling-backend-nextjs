import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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

  const agenciesRes = await getAllAgenciesOptions();
  const agencyOptions =
    agenciesRes?.data?.map((a) => ({ id: a.id as string, name: a.name })) ??
    [];

  return (
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
          toolbarLeft={
            <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
              <div className="relative w-full sm:max-w-sm">
                <SearchInput
                  name="keyword"
                  placeholder="Search by book number, start number, end number"
                  className="pl-8 w-full h-9"
                />
              </div>
              <FilterSection
                agencyOptions={agencyOptions}
                agencyId={params?.agencyId}
              />
            </div>
          }
          toolbarRight={
            <Link href="/agency-books/add">
              <Button size="sm" className="gap-1.5 h-9">
                <Plus className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add New
                </span>
              </Button>
            </Link>
          }
        />
      </Suspense>
    </div>
  );
}
