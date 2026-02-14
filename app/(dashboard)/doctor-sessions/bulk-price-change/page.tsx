import React, { Suspense } from 'react';
import Loading from '../../loading';
import { listBulkPriceChanges } from '@/app/actions/bulk-price-change.action';
import { BulkPriceChangeList } from './bulk-price-change-list';

export default async function BulkPriceChangePage() {
  const listRes = await listBulkPriceChanges();
  const data = listRes.success && listRes.data ? listRes.data : [];

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <BulkPriceChangeList initialData={data} />
      </Suspense>
    </div>
  );
}
