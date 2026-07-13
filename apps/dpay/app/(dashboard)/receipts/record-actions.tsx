'use client';

import { Row } from '@tanstack/react-table';
import { Button } from '@archmage/ui';
import { Download, Eye, Printer } from 'lucide-react';
import type { ReceiptListItem } from '@/types/receipt';
import type { PatientBillReceipt } from '@/types/patient-bill';
import {
  buildReceiptPrintHtml,
  downloadReceiptPdf,
  printReceiptHtml,
} from '@/lib/receipts/print-receipt';
import { useReceiptsView } from './receipts-view-context';

type ReceiptRecordActionsProps = {
  row: Row<ReceiptListItem>;
};

function toPatientBillReceipt(item: ReceiptListItem): PatientBillReceipt {
  return {
    id: item.id,
    receiptNumber: item.receiptNumber,
    amountPaid: item.amountPaid,
    paymentMethod: item.paymentMethod,
    referenceNumber: item.referenceNumber,
    remarks: item.remarks,
    outstandingAfter: item.outstandingAfter,
    paymentDate: item.paymentDate,
  };
}

export function ReceiptRecordActions({ row }: ReceiptRecordActionsProps) {
  const openView = useReceiptsView()?.openView;
  const item = row.original;
  const receipt = toPatientBillReceipt(item);

  const handlePrint = () => {
    printReceiptHtml(buildReceiptPrintHtml(receipt, item.bxtNumber));
  };

  const handleDownload = () => {
    downloadReceiptPdf(receipt, item.bxtNumber);
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="View receipt"
        onClick={() => openView?.(item)}
      >
        <Eye className="h-4 w-4" />
        <span className="sr-only">View</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="Print receipt"
        onClick={handlePrint}
      >
        <Printer className="h-4 w-4" />
        <span className="sr-only">Print</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="Download receipt (PDF)"
        onClick={handleDownload}
      >
        <Download className="h-4 w-4" />
        <span className="sr-only">Download</span>
      </Button>
    </div>
  );
}
