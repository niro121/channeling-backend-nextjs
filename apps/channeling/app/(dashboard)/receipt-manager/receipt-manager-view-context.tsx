"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CustomDataTable } from "@/components/common/custom-data-table";
import { ReceiptViewDialog } from "./receipt-view-dialog";
import { ReceiptManagerColumns } from "./columns";
import type { ReceiptListItem } from "@/services/receipt-manager/get-receipt-list.service";

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
  toolbarRight?: React.ReactNode;
};

export function ReceiptManagerTableWithDialog({
  data,
  totalRecords,
  page,
  limit,
  toolbarLeft,
  toolbarRight,
}: ReceiptManagerTableWithDialogProps) {
  const [viewReceiptId, setViewReceiptId] = useState<string | null>(null);
  const openView = useCallback((id: string) => setViewReceiptId(id), []);

  return (
    <>
      <ReceiptManagerViewContext.Provider value={{ openView }}>
        <CustomDataTable
          heading="Receipt Manager"
          subHeading="List all receipts. Click a receipt to view it and its linked double-entry journal."
          columns={ReceiptManagerColumns}
          data={data}
          rowCount={totalRecords}
          haveBulkDelete={false}
          page={page}
          limit={limit}
          toolbarLeft={toolbarLeft}
          toolbarRight={toolbarRight}
        />
      </ReceiptManagerViewContext.Provider>
      <ReceiptViewDialog
        open={viewReceiptId !== null}
        onOpenChange={(open) => !open && setViewReceiptId(null)}
        receiptId={viewReceiptId}
      />
    </>
  );
}
