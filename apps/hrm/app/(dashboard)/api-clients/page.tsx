import React, { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Button, CustomDataTable } from '@archmage/ui';
import { Plus } from 'lucide-react';
import Loading from '../loading';
import { authOptions } from '@/lib/auth';
import { checkPermission, checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getApiClientsAction } from '@/app/actions/api-client.actions';
import { apiClientColumns } from './columns';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
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

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="API Clients"
          subHeading="Approved machine clients for the Public Careers API. Create an API User under Users, then generate client ID and secret here."
          columns={apiClientColumns}
          data={result.data.data}
          rowCount={result.data.totalRecords}
          page={params?.page}
          toolbarRight={
            canAdd ? (
              <Link href="/api-clients/add">
                <Button size="sm" className="gap-1.5 h-9 cursor-pointer">
                  <Plus className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Add Client
                  </span>
                </Button>
              </Link>
            ) : null
          }
        />
      </Suspense>
    </div>
  );
}
