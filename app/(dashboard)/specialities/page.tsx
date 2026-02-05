import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { SpecialityColumns } from './columns';
import Loading from '../loading';
import Link from 'next/link';
import { bulkDeleteSpecialities, getAllSpecialities } from '@/app/actions/speciality.actions';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
  }>;
};

export default async function Page({ searchParams }: SearchParams) {
  // Check if user can view specialities
  const canView = await checkRouteAccess('/specialities');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;

  const { data, totalRecords } = await getAllSpecialities({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
  });

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="Specialities"
          subHeading="Manage your specialities here."
          columns={SpecialityColumns}
          data={data}
          rowCount={totalRecords}
          deleteServerAction={bulkDeleteSpecialities}
          page={params?.page}
          toolbarLeft={
            <div className="relative w-full sm:max-w-sm">
              <SearchInput
                name="keyword"
                placeholder="Search by name, code"
                className="pl-8 w-full h-9"
              />
            </div>
          }
          toolbarRight={
            <Link href="/specialities/add">
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
