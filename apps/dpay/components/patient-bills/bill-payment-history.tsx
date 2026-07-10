'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@archmage/ui';
import type { PatientBillReceipt } from '@/types/patient-bill';
import { PATIENT_BILL_PAYMENT_METHODS } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { PaymentDetailsButton, PaymentDetailsDialog } from './payment-details-dialog';

type BillPaymentHistoryProps = {
  receipts: PatientBillReceipt[];
  bxtNumber: string;
};

function paymentMethodLabel(method: string) {
  return PATIENT_BILL_PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

export function BillPaymentHistory({ receipts, bxtNumber }: BillPaymentHistoryProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<PatientBillReceipt | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openDetails = (receipt: PatientBillReceipt) => {
    setSelectedReceipt(receipt);
    setDetailsOpen(true);
  };

  const sortedReceipts = [...receipts].sort(
    (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  );

  return (
    <>
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="text-base font-semibold">Payment History</h2>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs uppercase tracking-wide">Receipt No</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Payment Date</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Amount Paid</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Payment Method</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Outstanding After</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                sortedReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium text-emerald-700">
                      {receipt.receiptNumber}
                    </TableCell>
                    <TableCell>
                      {format(new Date(receipt.paymentDate), 'yyyy-MM-dd')}
                    </TableCell>
                    <TableCell className="tabular-nums font-medium text-emerald-700">
                      {formatLkr(receipt.amountPaid)}
                    </TableCell>
                    <TableCell>{paymentMethodLabel(receipt.paymentMethod)}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatLkr(receipt.outstandingAfter)}
                    </TableCell>
                    <TableCell className="text-right">
                      <PaymentDetailsButton onClick={() => openDetails(receipt)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PaymentDetailsDialog
        receipt={selectedReceipt}
        bxtNumber={bxtNumber}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
}
