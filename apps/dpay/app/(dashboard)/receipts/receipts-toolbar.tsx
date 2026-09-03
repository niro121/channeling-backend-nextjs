'use client';

import { ExportWrapper } from '../export-wrapper';
import type { ReceiptExportRow } from '@/types/receipt';

const EXPORT_COLUMNS = [
  'Receipt No',
  'Bill No',
  'Doctor',
  'Payment Date',
  'Method',
  'Reference',
  'Amount',
  'Created By',
  'Status',
  'Cancel Reason',
  'Cancelled At',
  'Cancelled By',
];

const EXPORT_KEYS: (keyof ReceiptExportRow)[] = [
  'receiptNumber',
  'billNumber',
  'doctorName',
  'paymentDate',
  'paymentMethod',
  'referenceNumber',
  'amountPaid',
  'createdBy',
  'status',
  'cancelReason',
  'canceledAt',
  'canceledBy',
];

type ReceiptsToolbarProps = {
  serverData: () => Promise<{
    success: boolean;
    data?: ReceiptExportRow[];
    message?: string;
  }>;
};

export function ReceiptsToolbar({ serverData }: ReceiptsToolbarProps) {
  return (
    <ExportWrapper<ReceiptExportRow>
      serverData={serverData}
      columns={EXPORT_COLUMNS}
      keys={EXPORT_KEYS}
      title="Receipts"
      fileName="receipts"
    />
  );
}
