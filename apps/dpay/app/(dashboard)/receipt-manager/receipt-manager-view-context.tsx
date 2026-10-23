'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CustomDataTable } from '@archmage/ui';
import type { ReceiptListItem } from '@/types/receipt';
import { receiptManagerColumns } from './columns';
import { ReceiptViewDialog } from './receipt-view-dialog';

type ReceiptManagerViewContextValue = {
  openView: (receiptId: string) => void;
};

const ReceiptManagerViewContext = createContext<ReceiptManagerViewContextValue | null>(null);

export function useReceiptManagerView() {
  return useContext(ReceiptManagerViewContext);
}

type ReceiptManagerTableWithDialogProps = {
  data: ReceiptListItem[];
  totalRecords: number;
  page?: string;
  limit?: string;
  toolbarLeft: React.ReactNode;
};

export function ReceiptManagerTableWithDialog({
  data,
  totalRecords,
  page,
  limit,
  toolbarLeft,
}: ReceiptManagerTableWithDialogProps) {
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const openView = useCallback((id: string) => setReceiptId(id), []);

  return (
    <>
      <ReceiptManagerViewContext.Provider value={{ openView }}>
        <CustomDataTable
          heading="Receipt Manager"
          subHeading="Click a receipt to see it and the double-entry journals posted for it."
          columns={receiptManagerColumns}
          data={data}
          rowCount={totalRecords}
          haveBulkDelete={false}
          page={page}
          limit={limit}
          toolbarLeft={toolbarLeft}
        />
      </ReceiptManagerViewContext.Provider>

      <ReceiptViewDialog
        receiptId={receiptId}
        open={receiptId !== null}
        onOpenChange={(open) => !open && setReceiptId(null)}
      />
    </>
  );
}
