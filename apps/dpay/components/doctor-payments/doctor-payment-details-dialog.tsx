'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { Loader2, Printer } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@archmage/ui';
import { getDoctorPaymentByIdAction } from '@/app/actions/doctor-payments/doctor-payments.actions';
import { DoctorPaymentStatusBadge } from '@/components/doctor-payments/status-badge';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { paymentMethodLabel, paymentReferenceDisplay } from '@/lib/receipts/helpers';
import { formatIssuedLocation } from '@/lib/location';
import { printDoctorPayment } from '@/lib/doctor-payments/print-doctor-payment';
import type { DoctorPaymentDetail } from '@/types/doctor-payment';

type DoctorPaymentDetailsDialogProps = {
  paymentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: ReactNode;
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

export function DoctorPaymentDetailsDialog({
  paymentId,
  open,
  onOpenChange,
}: DoctorPaymentDetailsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DoctorPaymentDetail | null>(null);

  useEffect(() => {
    if (!open || !paymentId) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getDoctorPaymentByIdAction(paymentId)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setDetail(null);
          setError('Doctor payment not found.');
          return;
        }
        setDetail(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setDetail(null);
        setError(err instanceof Error ? err.message : 'Failed to load payment details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, paymentId]);

  const handlePrint = useCallback(() => {
    if (!detail) return;
    printDoctorPayment(detail);
  }, [detail]);

  const issuedLocation = detail
    ? formatIssuedLocation({
        locationName: detail.locationName,
        locationCode: detail.locationCode,
      })
    : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-[calc(100%-2rem)] gap-0 p-0 overflow-hidden">
        <DialogHeader className="border-b px-5 py-4 space-y-0">
          <DialogTitle className="text-base">Doctor Payment Details</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading details...
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          ) : detail ? (
            <>
              <div className="rounded-md border border-border/70 bg-muted/20 px-3">
                <DetailRow label="Receipt Number" value={detail.receiptNumber} highlight />
                <DetailRow
                  label="Status"
                  value={<DoctorPaymentStatusBadge status={detail.status} />}
                />
                <DetailRow label="Doctor" value={detail.doctorName} />
                {issuedLocation !== '—' ? (
                  <DetailRow label="Issued Location" value={issuedLocation} />
                ) : null}
                <DetailRow
                  label="Payment Method"
                  value={paymentMethodLabel(detail.paymentMethod)}
                />
                <DetailRow
                  label="Reference"
                  value={paymentReferenceDisplay({
                    paymentMethod: detail.paymentMethod,
                    referenceNumber: detail.referenceNumber ?? null,
                    bank: detail.bank ?? null,
                    cardReference: detail.cardReference ?? null,
                    slipReference: detail.slipReference ?? null,
                    slipDate: detail.slipDate ?? null,
                  })}
                />
                <DetailRow label="Total Amount" value={formatLkr(detail.totalAmount)} />
                <DetailRow
                  label={
                    detail.applyWht
                      ? `WHT (${detail.whtPercentage}%)`
                      : 'WHT'
                  }
                  value={formatLkr(detail.whtAmount)}
                />
                <DetailRow label="Net Amount" value={formatLkr(detail.netAmount)} highlight />
                <DetailRow label="Remarks" value={detail.remarks?.trim() || '—'} />
                {detail.status === 'refund' && detail.cancelReason?.trim() ? (
                  <DetailRow label="Refund Reason" value={detail.cancelReason} />
                ) : null}
                {detail.status === 'cancelled' && detail.cancelReason?.trim() ? (
                  <DetailRow label="Cancel Reason" value={detail.cancelReason} />
                ) : null}
                {detail.cancelReceiptNumber?.trim() ? (
                  <DetailRow label="Refund Receipt" value={detail.cancelReceiptNumber} />
                ) : null}
                {detail.status === 'refund' ? (
                  <DetailRow
                    label="Refund For"
                    value={
                      detail.remarks?.match(/Refund for ([^:]+):/)?.[1]?.trim() ||
                      'Original payment'
                    }
                  />
                ) : null}
                {detail.status === 'cancelled' && detail.canceledAt ? (
                  <DetailRow
                    label="Cancelled At"
                    value={format(new Date(detail.canceledAt), 'yyyy-MM-dd HH:mm')}
                  />
                ) : null}
                <DetailRow label="Created By" value={detail.createdBy} />
                <DetailRow
                  label="Created"
                  value={format(new Date(detail.createdAt), 'yyyy-MM-dd HH:mm')}
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Included Bills ({detail.bills.length})
                </p>
                {detail.bills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bills linked.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bill No</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead className="text-right">Payable</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.bills.map((bill) => (
                          <TableRow key={bill.billId}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {bill.billNumber}
                            </TableCell>
                            <TableCell>{bill.patientName}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatLkr(bill.payableAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            disabled={!detail || loading}
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
