import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { SearchInput } from '@archmage/ui';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getReceiptManagerListAction } from '@/app/actions/receipt-manager/receipt-manager.actions';
import ReceiptsFilterSection from '../receipts/filter-section';
import { ReceiptManagerTableWithDialog } from './receipt-manager-view-context';
import Loading from '../loading';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    method?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

export default async function ReceiptManagerPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/receipt-manager');
  if (!canView) redirect('/unauthorized-access');

  const params = await searchParams;
  const page = params?.page ? Number(params.page) : 1;
  const limit = params?.limit ? Number(params.limit) : 20;
  const method = params?.method;
  const status = params?.status;

  const listResult = await getReceiptManagerListAction({
    page,
    limit,
    keyword: params?.keyword ?? undefined,
    method: method && method !== '__all__' ? method : undefined,
    status: status && status !== '__all__' ? status : undefined,
    dateFrom: params?.dateFrom ?? undefined,
    dateTo: params?.dateTo ?? undefined,
  });

  const data = listResult.data ?? [];
  const totalRecords = listResult.totalRecords ?? 0;

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <ReceiptManagerTableWithDialog
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
                status={params?.status}
                dateFrom={params?.dateFrom}
                dateTo={params?.dateTo}
              />
            </div>
          }
        />
      </Suspense>
    </div>
  );
}
