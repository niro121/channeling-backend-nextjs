import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getAgenciesForAllowedCreditLimitControl } from '@/app/actions/agency.actions';
import Loading from '../../loading';
import { AllowedCreditLimitsClient } from './allowed-credit-limits-client';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
  }>;
};

export default async function Page({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/agencies/allowed-credit-limits');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;
  const { data, totalRecords } = await getAgenciesForAllowedCreditLimitControl({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword
  });

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <AllowedCreditLimitsClient
          data={data}
          rowCount={totalRecords}
          page={params?.page}
          limit={params?.limit}
        />
      </Suspense>
    </div>
  );
}
