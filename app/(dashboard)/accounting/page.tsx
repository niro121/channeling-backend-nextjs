import React, { Suspense } from 'react';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { AccountingColumns } from './columns';
import { AccountingToolbarActions } from './accounting-toolbar-actions';
import Loading from '../loading';
import { getAccounts } from '@/app/actions/accounting.actions';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    type?: string;
    locationId?: string;
  }>;
};

export default async function AccountingPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/accounting');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;

  const { data, totalRecords } = await getAccounts({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    type: params?.type ?? null,
    locationId: params?.locationId ?? null,
  });

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="Accounting"
          subHeading="Chart of accounts and balances."
          columns={AccountingColumns}
          data={data}
          rowCount={totalRecords}
          haveBulkDelete={false}
          page={params?.page}
          toolbarLeft={
            <div className="relative w-full sm:max-w-sm">
              <SearchInput
                name="keyword"
                placeholder="Search by name or code"
                className="pl-8 w-full h-9"
              />
            </div>
          }
          toolbarRight={<AccountingToolbarActions />}
        />
      </Suspense>
    </div>
  );
}
