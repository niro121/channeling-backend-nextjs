'use client';

import { useCallback } from 'react';
import { format } from 'date-fns';
import { Info, Printer } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@archmage/ui';
import type { PatientBillReceipt } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { paymentMethodLabel } from '@/lib/receipts/helpers';
import { buildReceiptPrintHtml, printReceiptHtml } from '@/lib/receipts/print-receipt';

type PaymentDetailsDialogProps = {
  receipt: PatientBillReceipt | null;
  bxtNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span
        className={`text-xs text-right font-medium ${highlight ? 'font-semibold text-emerald-700' : 'text-foreground'}`}
      >
        {value}
      </span>
    </div>
  );
}

export function PaymentDetailsDialog({
  receipt,
  bxtNumber,
  open,
  onOpenChange,
}: PaymentDetailsDialogProps) {
  const handlePrint = useCallback(() => {
    if (!receipt) return;
    printReceiptHtml(buildReceiptPrintHtml(receipt, bxtNumber));
  }, [receipt, bxtNumber]);

  if (!receipt) return null;

  const paymentDate = format(new Date(receipt.paymentDate), 'yyyy-MM-dd');
  const reference = receipt.referenceNumber?.trim() || '—';
  const remarks = receipt.remarks?.trim() || '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[calc(100%-2rem)] gap-0 p-0 overflow-hidden">
        <DialogHeader className="border-b px-5 py-4 space-y-0">
          <DialogTitle className="text-base">Payment Details</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4">
          <div className="rounded-md border border-border/70 bg-muted/20 px-3">
            <DetailRow label="Receipt Number" value={receipt.receiptNumber} highlight />
            <DetailRow label="BXT Number" value={bxtNumber} />
            <DetailRow label="Payment Date" value={paymentDate} />
            <DetailRow label="Amount Paid" value={formatLkr(receipt.amountPaid)} highlight />
            <DetailRow label="Payment Method" value={paymentMethodLabel(receipt.paymentMethod)} />
            <DetailRow label="Reference Number" value={reference} />
            <DetailRow label="Remarks" value={remarks} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 bg-emerald-800 hover:bg-emerald-900"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentDetailsButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1 h-7 px-2 text-xs"
      onClick={onClick}
    >
      <Info className="h-3 w-3" />
      Payment Details
    </Button>
  );
}
