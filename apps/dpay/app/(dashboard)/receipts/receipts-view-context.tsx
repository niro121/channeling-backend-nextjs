'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CustomDataTable } from '@archmage/ui';
import { PaymentDetailsDialog } from '@/components/patient-bills/payment-details-dialog';
import { receiptColumns } from './columns';
import type { ReceiptListItem } from '@/types/receipt';
import type { PatientBillReceipt } from '@/types/patient-bill';

type ReceiptsViewContextValue = {
  openView: (item: ReceiptListItem) => void;
};

const ReceiptsViewContext = createContext<ReceiptsViewContextValue | null>(null);

export function useReceiptsView() {
  return useContext(ReceiptsViewContext);
}

type ReceiptsTableWithDialogProps = {
  data: ReceiptListItem[];
  totalRecords: number;
  page?: string;
  limit?: string;
  toolbarLeft: React.ReactNode;
  toolbarRight?: React.ReactNode;
};

function toPatientBillReceipt(item: ReceiptListItem): PatientBillReceipt {
  return {
    id: item.id,
    receiptNumber: item.receiptNumber,
    amountPaid: item.amountPaid,
    paymentMethod: item.paymentMethod,
    referenceNumber: item.referenceNumber,
    bank: item.bank,
    bankId: item.bankId,
    cardReference: item.cardReference,
    slipReference: item.slipReference,
    slipDate: item.slipDate,
    locationId: item.locationId,
    locationCode: item.locationCode,
    locationName: item.locationName,
    remarks: item.remarks,
    outstandingAfter: item.outstandingAfter,
    paymentDate: item.paymentDate,
    status: item.status,
    cancelReceiptNumber: item.cancelReceiptNumber,
    refundOfReceiptId: item.refundOfReceiptId,
    cancelReason: item.cancelReason,
    canceledAt: item.canceledAt,
    canceledByName: item.canceledByName,
    createdByName: item.createdByName,
  };
}

export function ReceiptsTableWithDialog({
  data,
  totalRecords,
  page,
  limit,
  toolbarLeft,
  toolbarRight,
}: ReceiptsTableWithDialogProps) {
  const [selected, setSelected] = useState<ReceiptListItem | null>(null);
  const openView = useCallback((item: ReceiptListItem) => setSelected(item), []);

  return (
    <>
      <ReceiptsViewContext.Provider value={{ openView }}>
        <CustomDataTable
          heading="Receipts"
          subHeading="All payment receipts recorded across doctor bills."
          columns={receiptColumns}
          data={data}
          rowCount={totalRecords}
          haveBulkDelete={false}
          page={page}
          limit={limit}
          toolbarLeft={toolbarLeft}
          headingRight={toolbarRight}
        />
      </ReceiptsViewContext.Provider>

      <PaymentDetailsDialog
        receipt={selected ? toPatientBillReceipt(selected) : null}
        bxtNumber={selected?.bxtNumber ?? ''}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}
