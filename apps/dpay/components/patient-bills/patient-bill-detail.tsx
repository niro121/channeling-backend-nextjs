'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Ban, CheckCircle2, Pencil } from 'lucide-react';
import { BackButton, Button } from '@archmage/ui';
import type { PatientBillDetail } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { StatusBadge } from './status-badge';
import { BillDetailSummaryCards } from './bill-detail-summary-cards';
import { BillLineItemsTable } from './bill-line-items-table';
import { BillActivityTimeline } from './bill-activity-timeline';
import { BillPaymentHistory } from './bill-payment-history';
import { RecordPaymentDialog } from './record-payment-dialog';
import { CancelPatientBillDialog } from './cancel-patient-bill-dialog';
import { ClosePatientBillDialog } from './close-patient-bill-dialog';

type PatientBillDetailViewProps = {
  bill: PatientBillDetail;
};

export function PatientBillDetailView({ bill }: PatientBillDetailViewProps) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const createdLabel = format(new Date(bill.createdAt), 'yyyy-MM-dd');
  const isCancelled = bill.status === 'cancelled';
  const isClosed = bill.status === 'closed';
  const isDraft = bill.status === 'draft';
  const isLocked = isCancelled || isClosed;
  const canEdit = !isLocked;
  const canClose = bill.status === 'paid';
  const canPay = !isLocked && !isDraft && bill.outstandingAmount > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <BackButton href="/patient-bills" label="Back to Bills" />
          <div>
            <p className="text-sm text-muted-foreground">
              {bill.bxtNumber} &bull; {bill.billNumber}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight mt-1">{bill.customerName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Created {createdLabel}</span>
              <StatusBadge status={bill.status} />
            </div>
            {isDraft ? (
              <p className="mt-2 text-sm text-sky-800">
                Draft admission — add doctor charges before recording payment.
              </p>
            ) : null}
            {isCancelled && bill.cancelReason ? (
              <p className="mt-2 text-sm text-destructive">
                Cancel reason: {bill.cancelReason}
              </p>
            ) : null}
            {isClosed ? (
              <p className="mt-2 text-sm text-muted-foreground">
                This bill is closed and can no longer be modified.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canEdit && (
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href={`/patient-bills/${bill.id}/edit`}>
                <Pencil className="h-4 w-4" />
                {isDraft ? 'Add Charges' : 'Edit Bill'}
              </Link>
            </Button>
          )}
          {canClose && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              type="button"
              onClick={() => setCloseOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4" />
              Close
            </Button>
          )}
          {!isLocked && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                type="button"
                onClick={() => setCancelOpen(true)}
              >
                <Ban className="h-4 w-4" />
                Cancel
              </Button>
              {!isDraft && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={!canPay}
                  onClick={() => setPaymentOpen(true)}
                >
                  Pay {formatLkr(bill.outstandingAmount)}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <BillDetailSummaryCards
        totalAmount={bill.totalAmount}
        paidAmount={bill.paidAmount}
        outstandingAmount={bill.outstandingAmount}
        lineItemCount={bill.lineItems.length}
        receiptCount={bill.receipts.length}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BillLineItemsTable lineItems={bill.lineItems} totalAmount={bill.totalAmount} />
        </div>
        <BillActivityTimeline
          createdAt={bill.createdAt}
          createdByName={bill.createdByName}
          outstandingAmount={bill.outstandingAmount}
          receipts={bill.receipts}
          status={bill.status}
          canceledAt={bill.canceledAt}
          canceledByName={bill.canceledByName}
        />
      </div>

      <BillPaymentHistory
        receipts={bill.receipts}
        bxtNumber={bill.bxtNumber}
        billNumber={bill.billNumber}
        billCancelled={isLocked}
      />

      <RecordPaymentDialog bill={bill} open={paymentOpen} onOpenChange={setPaymentOpen} />
      <CancelPatientBillDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        billId={bill.id}
        billNumber={bill.billNumber}
        receiptCount={bill.receipts.length}
      />
      <ClosePatientBillDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        billId={bill.id}
        billNumber={bill.billNumber}
      />
    </div>
  );
}
