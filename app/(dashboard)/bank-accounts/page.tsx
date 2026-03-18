import React, { Suspense } from 'react';
import { checkRouteAccess, checkPermission } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { BankAccountColumns } from './columns';
import { getAllBankAccounts, bulkDeleteBankAccounts } from '@/app/actions/bank-account.actions';
import Loading from '../loading';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    bankId?: string;
    locationId?: string;
  }>;
};

export default async function BankAccountsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/bank-accounts');
  if (!canView) redirect('/unauthorized-access');

  const canAdd = await checkPermission('bank-accounts', 'add');
  const params = await searchParams;
  const { data, totalRecords } = await getAllBankAccounts({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    bankId: params?.bankId,
    locationId: params?.locationId,
  });

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="Bank Accounts"
          subHeading="Manage bank accounts for deposits. Link each account to a bank (tag) and institution (location)."
          columns={BankAccountColumns}
          data={data}
          rowCount={totalRecords}
          deleteServerAction={bulkDeleteBankAccounts}
          page={params?.page}
          toolbarLeft={
            <div className="relative w-full sm:max-w-sm">
              <SearchInput
                name="keyword"
                placeholder="Search by name or account number"
                className="pl-8 w-full h-9"
              />
            </div>
          }
          toolbarRight={
            canAdd ? (
              <Link href="/bank-accounts/add">
                <Button size="sm" className="gap-1.5 h-9">
                  <Plus className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add New</span>
                </Button>
              </Link>
            ) : null
          }
        />
      </Suspense>
    </div>
  );
}
