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
import { formatLkr } from '@/lib/patient-bills/calculations';
import { paymentMethodLabel } from '@/lib/receipts/helpers';
import { ReceiptStatusBadge } from '@/components/receipts/receipt-status-badge';
import { CancelPatientBillReceiptDialog } from '@/components/receipts/cancel-patient-bill-receipt-dialog';
import { CancelActionButton } from '@/components/ui/cancel-action-button';
import { PaymentDetailsButton, PaymentDetailsDialog } from './payment-details-dialog';

type BillPaymentHistoryProps = {
  receipts: PatientBillReceipt[];
  bxtNumber: string;
  billNumber?: string;
  billCancelled?: boolean;
};

export function BillPaymentHistory({
  receipts,
  bxtNumber,
  billNumber,
  billCancelled = false,
}: BillPaymentHistoryProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<PatientBillReceipt | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelReceipt, setCancelReceipt] = useState<PatientBillReceipt | null>(null);

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
                <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
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
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                sortedReceipts.map((receipt) => {
                  const status = receipt.status ?? 'active';
                  const isInactive = status === 'cancelled' || status === 'refund';
                  const canCancel =
                    status === 'active' &&
                    !receipt.cancelReceiptNumber &&
                    !receipt.refundOfReceiptId &&
                    !billCancelled;
                  return (
                    <TableRow key={receipt.id}>
                      <TableCell
                        className={
                          isInactive
                            ? 'font-medium text-muted-foreground'
                            : 'font-medium text-emerald-700'
                        }
                      >
                        {receipt.receiptNumber}
                      </TableCell>
                      <TableCell>
                        <ReceiptStatusBadge status={status} />
                      </TableCell>
                      <TableCell>
                        {format(new Date(receipt.paymentDate), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell
                        className={
                          isInactive
                            ? 'tabular-nums font-medium text-muted-foreground line-through'
                            : 'tabular-nums font-medium text-emerald-700'
                        }
                      >
                        {formatLkr(receipt.amountPaid)}
                      </TableCell>
                      <TableCell>{paymentMethodLabel(receipt.paymentMethod)}</TableCell>
                      <TableCell className="tabular-nums">
                        {formatLkr(receipt.outstandingAfter)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <PaymentDetailsButton onClick={() => openDetails(receipt)} />
                          {canCancel && (
                            <CancelActionButton
                              className="h-7 gap-1 px-2 text-xs"
                              iconClassName="h-3 w-3"
                              onClick={() => setCancelReceipt(receipt)}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
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
      {cancelReceipt ? (
        <CancelPatientBillReceiptDialog
          open={!!cancelReceipt}
          onOpenChange={(open) => {
            if (!open) setCancelReceipt(null);
          }}
          receiptId={cancelReceipt.id}
          receiptNumber={cancelReceipt.receiptNumber}
          amountPaid={cancelReceipt.amountPaid}
          billNumber={billNumber}
          originalPaymentMethod={cancelReceipt.paymentMethod}
        />
      ) : null}
    </>
  );
}
