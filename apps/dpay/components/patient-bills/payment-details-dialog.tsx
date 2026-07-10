'use client';

import { useCallback, useRef } from 'react';
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
import { PATIENT_BILL_PAYMENT_METHODS } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';

type PaymentDetailsDialogProps = {
  receipt: PatientBillReceipt | null;
  bxtNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function paymentMethodLabel(method: string) {
  return PATIENT_BILL_PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

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

function buildPrintHtml(receipt: PatientBillReceipt, bxtNumber: string) {
  const paymentDate = format(new Date(receipt.paymentDate), 'yyyy-MM-dd');
  const method = paymentMethodLabel(receipt.paymentMethod);
  const reference = receipt.referenceNumber?.trim() || '—';
  const remarks = receipt.remarks?.trim() || '—';
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Receipt ${escape(receipt.receiptNumber)}</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 24px; color: #111; max-width: 480px; margin: 0 auto; }
      h1 { font-size: 18px; margin: 0 0 16px; }
      .row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
      .label { color: #6b7280; }
      .value { font-weight: 600; text-align: right; }
      .highlight { color: #047857; font-weight: 700; }
    </style>
  </head>
  <body>
    <h1>Payment Receipt</h1>
    <div class="row"><span class="label">Receipt Number</span><span class="value highlight">${escape(receipt.receiptNumber)}</span></div>
    <div class="row"><span class="label">BXT Number</span><span class="value">${escape(bxtNumber)}</span></div>
    <div class="row"><span class="label">Payment Date</span><span class="value">${paymentDate}</span></div>
    <div class="row"><span class="label">Amount Paid</span><span class="value highlight">${escape(formatLkr(receipt.amountPaid))}</span></div>
    <div class="row"><span class="label">Payment Method</span><span class="value">${escape(method)}</span></div>
    <div class="row"><span class="label">Reference Number</span><span class="value">${escape(reference)}</span></div>
    <div class="row"><span class="label">Remarks</span><span class="value">${escape(remarks)}</span></div>
  </body>
</html>`;
}

export function PaymentDetailsDialog({
  receipt,
  bxtNumber,
  open,
  onOpenChange,
}: PaymentDetailsDialogProps) {
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  const handlePrint = useCallback(() => {
    if (!receipt) return;

    const html = buildPrintHtml(receipt, bxtNumber);
    const existing = printFrameRef.current;
    if (existing?.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Print receipt');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
    printFrameRef.current = iframe;

    const frameWindow = iframe.contentWindow;
    const frameDoc = frameWindow?.document;
    if (!frameWindow || !frameDoc) {
      document.body.removeChild(iframe);
      return;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    const runPrint = () => {
      try {
        frameWindow.focus();
        frameWindow.print();
      } finally {
        window.setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
          if (printFrameRef.current === iframe) {
            printFrameRef.current = null;
          }
        }, 1000);
      }
    };

    if (frameDoc.readyState === 'complete') {
      runPrint();
    } else {
      iframe.onload = runPrint;
      window.setTimeout(runPrint, 500);
    }
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
