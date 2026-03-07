import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { AgencyBookColumns } from './columns';
import Loading from '../loading';
import Link from 'next/link';
import {
  bulkDeleteAgencyBooks,
  getAllAgencyBooks,
  getAgencyBooksExport
} from '@/app/actions/agencybook.actions';
import { getAllAgenciesOptions } from '@/app/actions/agency.actions';
import FilterSection from './filter-section';
import { checkRouteAccess } from '@/lib/server-permissions';
import { logActivity } from '@/lib/activity-log';
import { redirect } from 'next/navigation';
import { ExportWrapper } from '../export-wrapper';
import { BulkDeleteButton } from '@/components/common/custom-data-table';

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
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      action: 'agency-books.visited',
      entityType: 'AgencyBooks',
      importance: 'low',
    });
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

  const handleExport = async () => {
    'use server';

    const agencyBookListResponse = await getAgencyBooksExport({
      keyword: params?.keyword,
      agencyId: params?.agencyId
    });

    if (!agencyBookListResponse.success || !agencyBookListResponse.data?.length) {
      return {
        success: false,
        message: agencyBookListResponse.success
          ? 'No agency books found'
          : agencyBookListResponse.message
      };
    }

    const mappedAgencyBooks = agencyBookListResponse.data.map((ab: any) => ({
      bookNumber: ab.bookNumber || '-',
      agency: ab.agency?.name || '-',
      startNumber: ab.startNumber || '-',
      endNumber: ab.endNumber || '-'
    }));

    return {
      success: true,
      data: mappedAgencyBooks
    };
  };

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
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row gap-3 items-start">
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
              <div className="flex items-center">
                <ExportWrapper
                  serverData={handleExport}
                  columns={['Book Number', 'Agency', 'Start Number', 'End Number']}
                  keys={['bookNumber', 'agency', 'startNumber', 'endNumber']}
                  title="Agency Books List"
                  fileName="agency-books"
                />
              </div>
            </div>
          }
          toolbarRight={
            <div className="flex items-start gap-2 shrink-0">
              <BulkDeleteButton />
              <Link href="/agency-books/add">
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
