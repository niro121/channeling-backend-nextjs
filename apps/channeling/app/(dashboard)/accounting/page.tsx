import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SearchInput } from '@/components/common/search';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { AccountingColumns } from './columns';
import { AccountingToolbarActions } from './accounting-toolbar-actions';
import { AccountingFilterSection } from './accounting-filter-section';
import Loading from '../loading';
import { getAccounts } from '@/app/actions/accounting.actions';
import { checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
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
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'accounting.visited',
      entityType: 'Accounting',
      importance: 'low',
    });
  }

  const params = await searchParams;

  const typeParam = params?.type;
  const type =
    typeParam && typeParam !== "__all__" ? typeParam : null;

  const { data, totalRecords } = await getAccounts({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    type,
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
            <div className="flex flex-wrap items-center gap-3 w-full sm:max-w-full">
              <div className="relative w-full sm:max-w-sm">
                <SearchInput
                  name="keyword"
                  placeholder="Search by name or code"
                  className="pl-8 w-full h-9"
                />
              </div>
              <AccountingFilterSection type={params?.type} />
            </div>
          }
          toolbarRight={<AccountingToolbarActions />}
        />
      </Suspense>
    </div>
  );
}
