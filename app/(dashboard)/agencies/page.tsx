import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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
  const canView = await checkRouteAccess('/agencies');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;

  const { data, totalRecords } = await getAllAgencies({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword
  });

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
          toolbarLeft={
            <div className="relative w-full sm:max-w-sm">
              <SearchInput
                name="keyword"
                placeholder="Search by name, code, email, phone"
                className="pl-8 w-full h-9"
              />
            </div>
          }
          toolbarRight={
            <div className="flex items-center gap-2 shrink-0">
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
              <Link href="/agencies/add">
                <Button size="sm" className="gap-1.5 h-9">
                  <Plus className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Add New
                  </span>
                </Button>
              </Link>
            </div>
          }
        />
      </Suspense>
    </div>
  );
}
