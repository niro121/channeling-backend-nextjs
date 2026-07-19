'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Ban } from 'lucide-react';
import {
  Button,
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
import { ReceiptStatusBadge } from '@/components/receipts/receipt-status-badge';
import { CancelPatientBillReceiptDialog } from '@/components/receipts/cancel-patient-bill-receipt-dialog';
import { PaymentDetailsButton, PaymentDetailsDialog } from './payment-details-dialog';

type BillPaymentHistoryProps = {
  receipts: PatientBillReceipt[];
  bxtNumber: string;
  billNumber?: string;
  billCancelled?: boolean;
};

function paymentMethodLabel(method: string) {
  return PATIENT_BILL_PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

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
                  const isCancelled = receipt.status === 'cancelled';
                  return (
                    <TableRow key={receipt.id}>
                      <TableCell
                        className={
                          isCancelled
                            ? 'font-medium text-muted-foreground'
                            : 'font-medium text-emerald-700'
                        }
                      >
                        {receipt.receiptNumber}
                      </TableCell>
                      <TableCell>
                        <ReceiptStatusBadge status={receipt.status ?? 'active'} />
                      </TableCell>
                      <TableCell>
                        {format(new Date(receipt.paymentDate), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell
                        className={
                          isCancelled
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
                          {!isCancelled && !billCancelled && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setCancelReceipt(receipt)}
                            >
                              <Ban className="h-3 w-3" />
                              Cancel
                            </Button>
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
        />
      ) : null}
    </>
  );
}
