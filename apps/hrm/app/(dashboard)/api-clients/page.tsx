import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Loading from '../loading';
import { authOptions } from '@/lib/auth';
import { checkPermission, checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getApiClientsAction } from '@/app/actions/api-client.actions';
import { apiClientColumns } from './columns';
import { ApiClientsShell } from './api-clients-shell';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    tab?: string;
  }>;
};

export default async function ApiClientsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/api-clients');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'api_clients.visited',
      entityType: 'ApiClients',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const result = await getApiClientsAction({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword
  });

  if (result.isError || !result.data) {
    throw new Error(
      (result.errors as { message?: string })?.message ??
        'Failed to load API clients'
    );
  }

  const canAdd = await checkPermission('users', 'add');
  const defaultTab =
    params?.tab === 'playground' ? 'playground' : 'clients';

  return (
    <Suspense fallback={<Loading />}>
      <ApiClientsShell
        columns={apiClientColumns}
        data={result.data.data}
        totalRecords={result.data.totalRecords}
        page={params?.page}
        canAdd={canAdd}
        defaultTab={defaultTab}
      />
    </Suspense>
  );
}
