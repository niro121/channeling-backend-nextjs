'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { bulkPriceChangeColumns } from './columns';
import { bulkDeleteBulkPriceChanges } from '@/app/actions/bulk-price-change.action';
import { CreateBulkPriceChangeDialog } from './create-bulk-price-change-dialog';
import { BulkPriceChangeDetailDialog } from './bulk-price-change-detail-dialog';
import { BulkPriceChangeListProvider } from './bulk-price-change-context';
import type { BulkPriceChangeListRow } from './record-actions';

type BulkPriceChangeListProps = {
  initialData: BulkPriceChangeListRow[];
};

export function BulkPriceChangeList({ initialData }: BulkPriceChangeListProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBulkId, setDetailBulkId] = useState<string | null>(null);

  const openDetail = useCallback((id: string) => {
    setDetailBulkId(id);
    setDetailOpen(true);
  }, []);

  const handleDetailClose = useCallback(() => {
    setDetailOpen(false);
    setDetailBulkId(null);
    router.refresh();
  }, [router]);

  const handleDetailOpenChange = useCallback(
    (open: boolean) => {
      setDetailOpen(open);
      if (!open) {
        setDetailBulkId(null);
        router.refresh();
      }
    },
    [router]
  );

  const handleCreated = (id: string) => {
    setCreateOpen(false);
    openDetail(id);
  };

  return (
    <BulkPriceChangeListProvider value={{ openDetail }}>
      <CustomDataTable<BulkPriceChangeListRow, unknown>
        heading="Doctor session bulk price change"
        subHeading="Bulk update doctor session fees. Add rules, preview, then process."
        columns={bulkPriceChangeColumns}
        data={initialData}
        rowCount={initialData.length}
        deleteServerAction={bulkDeleteBulkPriceChanges}
        page="0"
        limit="50"
        toolbarLeft={<div className="flex-1 min-w-0" />}
        toolbarRight={
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" className="gap-1.5 h-9" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add New</span>
            </Button>
          </div>
        }
      />
      <CreateBulkPriceChangeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
      <BulkPriceChangeDetailDialog
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
        bulkId={detailBulkId}
        onClose={handleDetailClose}
      />
    </BulkPriceChangeListProvider>
  );
}
