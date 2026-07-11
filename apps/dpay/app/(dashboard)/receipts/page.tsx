import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { SearchInput } from '@archmage/ui';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getReceiptsAction, getReceiptsExportAction } from '@/app/actions/receipts/receipts.actions';
import ReceiptsFilterSection from './filter-section';
import { ReceiptsTableWithDialog } from './receipts-view-context';
import { ReceiptsToolbar } from './receipts-toolbar';
import Loading from '../loading';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    method?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

export default async function ReceiptsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/receipts');
  if (!canView) redirect('/unauthorized-access');

  const params = await searchParams;
  const page = params?.page ? Number(params.page) : 1;
  const limit = params?.limit ? Number(params.limit) : 20;
  const method = params?.method;

  const listResult = await getReceiptsAction({
    page,
    limit,
    keyword: params?.keyword ?? undefined,
    method: method && method !== '__all__' ? method : undefined,
    dateFrom: params?.dateFrom ?? undefined,
    dateTo: params?.dateTo ?? undefined,
  });

  const data = listResult.data ?? [];
  const totalRecords = listResult.totalRecords ?? 0;

  async function handleExport() {
    'use server';
    return getReceiptsExportAction({
      keyword: params?.keyword ?? undefined,
      method: method && method !== '__all__' ? method : undefined,
      dateFrom: params?.dateFrom ?? undefined,
      dateTo: params?.dateTo ?? undefined,
    });
  }

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <ReceiptsTableWithDialog
          data={data}
          totalRecords={totalRecords}
          page={params?.page}
          limit={params?.limit}
          toolbarLeft={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:max-w-sm">
                <SearchInput
                  name="keyword"
                  placeholder="Search receipts..."
                  className="pl-8 w-full h-9"
                />
              </div>
              <ReceiptsFilterSection
                method={params?.method}
                dateFrom={params?.dateFrom}
                dateTo={params?.dateTo}
              />
            </div>
          }
          toolbarRight={<ReceiptsToolbar serverData={handleExport} />}
        />
      </Suspense>
    </div>
  );
}
