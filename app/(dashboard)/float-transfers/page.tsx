import React, { Suspense } from 'react';
import { checkRouteAccess } from '@/lib/server-permissions';
import { logActivity } from '@/lib/activity-log';
import { fetchServerSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getFloatRequestsForBulkCashierPaginatedAction } from '@/app/actions/float-request.actions';
import { FloatTransfersContent } from './float-transfers-content';
import Loading from '../loading';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    status?: string;
  }>;
};

export default async function FloatTransfersPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/float-transfers');
  if (!canView) redirect('/unauthorized-access');

  const session = await fetchServerSession();
  const bulkCashierId = session?.user?.id;
  if (!bulkCashierId) redirect('/unauthorized-access');
  await logActivity({
    userId: bulkCashierId,
    action: 'float-transfers.visited',
    entityType: 'FloatTransfers',
    importance: 'low',
  });

  const params = await searchParams;
  const page = params?.page ? parseInt(params.page, 10) : 0;
  const limit = params?.limit ? parseInt(params.limit, 10) : 10;
  const statusParam = params?.status;
  const status =
    statusParam && statusParam !== '__all__'
      ? parseInt(statusParam, 10)
      : undefined;

  const result = await getFloatRequestsForBulkCashierPaginatedAction(bulkCashierId, {
    page,
    limit,
    status: status ?? null,
  });

  const data = result.success && result.data ? result.data : [];
  const totalRecords = result.success ? result.totalRecords ?? 0 : 0;

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <FloatTransfersContent
          bulkCashierId={bulkCashierId}
          initialData={data}
          initialTotalRecords={totalRecords}
          page={params?.page}
          limit={params?.limit}
          status={params?.status}
        />
      </Suspense>
    </div>
  );
}
