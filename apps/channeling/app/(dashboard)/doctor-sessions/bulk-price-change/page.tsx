import React, { Suspense } from 'react';
import Loading from '../../loading';
import { listBulkPriceChanges } from '@/app/actions/bulk-price-change.action';
import { BulkPriceChangeList } from './bulk-price-change-list';

// Avoid static prerender so permission check runs at request time (no session at build).
export const dynamic = 'force-dynamic';

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
