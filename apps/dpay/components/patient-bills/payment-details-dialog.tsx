'use client';

import { useCallback } from 'react';
import { format } from 'date-fns';
import { Info, Printer } from 'lucide-react';
import { RECEIPT_PAYMENT_METHOD } from '@archmage/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@archmage/ui';
import type { PatientBillReceipt } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import {
  parsePaymentMethodCode,
  paymentMethodLabel,
  paymentReferenceDisplay,
} from '@/lib/receipts/helpers';
import { formatIssuedLocation } from '@/lib/location';
import { buildReceiptPrintHtml, printReceiptHtml } from '@/lib/receipts/print-receipt';
import { ReceiptStatusBadge } from '@/components/receipts/receipt-status-badge';

type PaymentDetailsDialogProps = {
  receipt: PatientBillReceipt | null;
  bxtNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown after recording a payment (e.g. "Payment recorded"). */
  title?: string;
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
  title = 'Payment Details',
}: PaymentDetailsDialogProps) {
  const handlePrint = useCallback(() => {
    if (!receipt) return;
    printReceiptHtml(buildReceiptPrintHtml(receipt, bxtNumber));
  }, [receipt, bxtNumber]);

  if (!receipt) return null;

  const paymentDate = format(new Date(receipt.paymentDate), 'yyyy-MM-dd HH:mm:ss');
  const remarks = receipt.remarks?.trim() || '—';
  const status = receipt.status ?? 'active';
  const cancelReason = receipt.cancelReason?.trim();
  const canceledAt = receipt.canceledAt
    ? format(new Date(receipt.canceledAt), 'yyyy-MM-dd HH:mm:ss')
    : null;
  const canceledBy = receipt.canceledByName?.trim() || null;
  const createdBy = receipt.createdByName?.trim() || null;
  const code = parsePaymentMethodCode(receipt.paymentMethod);
  const bank = receipt.bank?.trim();
  const cardReference = receipt.cardReference?.trim();
  const slipReference = receipt.slipReference?.trim();
  const slipDate = receipt.slipDate
    ? format(new Date(receipt.slipDate), 'yyyy-MM-dd')
    : null;
  const hasMethodMeta = Boolean(bank || cardReference || slipReference || slipDate);
  const issuedLocation = formatIssuedLocation({
    locationName: receipt.locationName,
    locationCode: receipt.locationCode,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[calc(100%-2rem)] gap-0 p-0 overflow-hidden">
        <DialogHeader className="border-b px-5 py-4 space-y-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Status</span>
            <ReceiptStatusBadge status={status} />
          </div>
          <div className="rounded-md border border-border/70 bg-muted/20 px-3">
            <DetailRow label="Receipt Number" value={receipt.receiptNumber} highlight />
            <DetailRow label="BHT Number" value={bxtNumber} />
            {issuedLocation !== '—' ? (
              <DetailRow label="Issued Location" value={issuedLocation} />
            ) : null}
            <DetailRow label="Payment Date" value={paymentDate} />
            <DetailRow label="Amount Paid" value={formatLkr(receipt.amountPaid)} highlight />
            <DetailRow label="Payment Method" value={paymentMethodLabel(receipt.paymentMethod)} />
            {bank ? <DetailRow label="Bank" value={bank} /> : null}
            {code === RECEIPT_PAYMENT_METHOD.CREDIT_CARD && cardReference ? (
              <DetailRow label="Card Reference" value={cardReference} />
            ) : null}
            {code === RECEIPT_PAYMENT_METHOD.E_WALLET && cardReference ? (
              <DetailRow label="E-Wallet Reference" value={cardReference} />
            ) : null}
            {code === RECEIPT_PAYMENT_METHOD.SLIP && slipReference ? (
              <DetailRow label="Slip Reference" value={slipReference} />
            ) : null}
            {code === RECEIPT_PAYMENT_METHOD.CHECK && slipReference ? (
              <DetailRow label="Cheque Number" value={slipReference} />
            ) : null}
            {code === RECEIPT_PAYMENT_METHOD.SLIP && slipDate ? (
              <DetailRow label="Slip Date" value={slipDate} />
            ) : null}
            {code === RECEIPT_PAYMENT_METHOD.CHECK && slipDate ? (
              <DetailRow label="Cheque Date" value={slipDate} />
            ) : null}
            {!hasMethodMeta ? (
              <DetailRow label="Reference" value={paymentReferenceDisplay(receipt)} />
            ) : null}
            <DetailRow label="Remarks" value={remarks} />
            <DetailRow label="Created By" value={createdBy || '—'} />
            {receipt.cancelReceiptNumber?.trim() ? (
              <DetailRow
                label="Refund Receipt"
                value={receipt.cancelReceiptNumber}
                highlight
              />
            ) : null}
            {status === 'refund' && cancelReason ? (
              <DetailRow label="Refund Reason" value={cancelReason} />
            ) : null}
            {status === 'cancelled' ? (
              <>
                {cancelReason ? (
                  <DetailRow label="Cancel Reason" value={cancelReason} />
                ) : null}
                {canceledAt ? (
                  <DetailRow label="Cancelled At" value={canceledAt} />
                ) : null}
                <DetailRow label="Cancelled By" value={canceledBy || '—'} />
              </>
            ) : null}
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
