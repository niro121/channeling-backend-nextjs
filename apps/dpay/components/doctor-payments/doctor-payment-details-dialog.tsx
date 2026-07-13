'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
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
import {
  DOCTOR_PAYMENT_METHODS,
  type DoctorPaymentDetail,
} from '@/types/doctor-payment';

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

function methodLabel(method: string) {
  return DOCTOR_PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
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
                <DetailRow label="Payment Method" value={methodLabel(detail.paymentMethod)} />
                <DetailRow
                  label="Reference Number"
                  value={detail.referenceNumber?.trim() || '—'}
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
                {detail.cancelReason?.trim() ? (
                  <DetailRow label="Cancel Reason" value={detail.cancelReason} />
                ) : null}
                {detail.cancelReceiptNumber?.trim() ? (
                  <DetailRow label="Cancel Receipt" value={detail.cancelReceiptNumber} />
                ) : null}
                {detail.canceledAt ? (
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

        <div className="flex justify-end border-t px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
