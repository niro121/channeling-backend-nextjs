import React, { Suspense } from 'react';
import { checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { fetchServerSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import {
  getFloatRequestsForBulkCashierPaginatedAction,
  getFloatRequestsRequestedByMePaginatedAction,
  getFloatRequestUserOptionsAction,
} from '@/app/actions/float-request.actions';
import { FloatTransfersContent } from './float-transfers-content';
import { parseFloatTransferTab } from './float-transfers-types';
import Loading from '../loading';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    status?: string;
    requestedById?: string;
    bulkCashierId?: string;
    tab?: string;
  }>;
};

export default async function FloatTransfersPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/float-transfers');
  if (!canView) redirect('/unauthorized-access');

  const session = await fetchServerSession();
  const bulkCashierId = session?.user?.id;
  if (!bulkCashierId) redirect('/unauthorized-access');
  logActivityNonBlocking({
    userId: bulkCashierId,
    action: 'float-transfers.visited',
    entityType: 'FloatTransfers',
    importance: 'low',
  });

  const params = await searchParams;
  const tab = parseFloatTransferTab(params?.tab);
  const page = params?.page ? parseInt(params.page, 10) : 0;
  const limit = params?.limit ? parseInt(params.limit, 10) : 10;
  const statusParam = params?.status;
  const status =
    statusParam && statusParam !== '__all__'
      ? parseInt(statusParam, 10)
      : undefined;

  const requestedById =
    params?.requestedById && params.requestedById !== '__all__'
      ? params.requestedById
      : null;

  const bulkCashierFilterId =
    params?.bulkCashierId && params.bulkCashierId !== '__all__'
      ? params.bulkCashierId
      : null;

  const [result, userOptionsResult] = await Promise.all([
    tab === 'requested'
      ? getFloatRequestsRequestedByMePaginatedAction({
          page,
          limit,
          status: status ?? null,
          bulkCashierId: bulkCashierFilterId,
        })
      : getFloatRequestsForBulkCashierPaginatedAction(bulkCashierId, {
          page,
          limit,
          status: status ?? null,
          requestedById,
        }),
    getFloatRequestUserOptionsAction(),
  ]);

  const data = result.success && result.data ? result.data : [];
  const totalRecords = result.success ? result.totalRecords ?? 0 : 0;
  const userOptions =
    userOptionsResult.success && userOptionsResult.data ? userOptionsResult.data : [];

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <FloatTransfersContent
          bulkCashierId={bulkCashierId}
          initialData={data}
          initialTotalRecords={totalRecords}
          userOptions={userOptions}
          page={params?.page}
          limit={params?.limit}
          status={params?.status}
          requestedById={params?.requestedById}
          bulkCashierFilterId={params?.bulkCashierId}
          tab={tab}
        />
      </Suspense>
    </div>
  );
}
