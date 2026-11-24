'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Loader2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
  useToast,
} from '@archmage/ui';
import {
  getPatientBillOverpaymentRefundStatusAction,
  refundOverpaidPatientBillAction,
} from '@/app/actions/patient-bills/patient-bills.actions';
import type { PatientBillPaymentMethod, PatientBillReceipt } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { OVERPAYMENT_ALREADY_REFUNDED_MESSAGE } from '@/lib/patient-bills/overpayment-refund';
import {
  hasRecordPaymentErrors,
  validatePaymentMethodFields,
} from '@/lib/patient-bills/payment-validations';
import { paymentMethodLabel } from '@/lib/receipts/helpers';
import {
  emptyRefundMethodValues,
  RefundMethodFields,
  type RefundMethodValues,
} from '@/components/receipts/refund-method-fields';

type RefundOverpaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  billNumber: string;
  overpaidAmount: number;
};

type DialogView =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'already_refunded';
      refunds: PatientBillReceipt[];
    }
  | { kind: 'form'; liveOverpaidAmount: number };

function isAlreadySettledMessage(message: string): boolean {
  return (
    message === OVERPAYMENT_ALREADY_REFUNDED_MESSAGE ||
    message === 'This bill is not over-paid. No refund is required.'
  );
}

export function RefundOverpaymentDialog({
  open,
  onOpenChange,
  billId,
  billNumber,
  overpaidAmount,
}: RefundOverpaymentDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState<RefundMethodValues>(() => emptyRefundMethodValues());
  const [errors, setErrors] = useState<ReturnType<typeof validatePaymentMethodFields>>({});
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<DialogView>({ kind: 'loading' });

  useEffect(() => {
    if (!open) return;

    setReason('');
    setRefund(emptyRefundMethodValues());
    setErrors({});
    setView({ kind: 'loading' });

    let cancelled = false;
    void (async () => {
      const result = await getPatientBillOverpaymentRefundStatusAction(billId);
      if (cancelled) return;

      if (!result.success) {
        setView({ kind: 'error', message: result.message });
        return;
      }

      if (result.overpaidAmount <= 0) {
        setView({ kind: 'already_refunded', refunds: result.overpaymentRefunds });
        router.refresh();
        return;
      }

      setView({ kind: 'form', liveOverpaidAmount: result.overpaidAmount });
    })();

    return () => {
      cancelled = true;
    };
  }, [open, billId, router]);

  const handleBanksError = useCallback(
    (message: string) => {
      toast({
        variant: 'destructive',
        title: 'Could not load banks',
        description: message,
      });
    },
    [toast]
  );

  const showAlreadyRefunded = useCallback(
    async (fallbackRefunds: PatientBillReceipt[] = []) => {
      const status = await getPatientBillOverpaymentRefundStatusAction(billId);
      const refunds =
        status.success && status.overpaymentRefunds.length > 0
          ? status.overpaymentRefunds
          : fallbackRefunds;
      setView({ kind: 'already_refunded', refunds });
      router.refresh();
    },
    [billId, router]
  );

  const handleRefund = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast({
        variant: 'destructive',
        title: 'Reason required',
        description: 'Please enter a reason for refunding this overpayment.',
      });
      return;
    }

    const methodErrors = validatePaymentMethodFields({
      paymentMethod: refund.refundPaymentMethod,
      bank: refund.bank,
      bankId: refund.bankId,
      cardReference: refund.cardReference,
      slipReference: refund.slipReference,
      slipDate: refund.slipDate,
    });
    setErrors(methodErrors);
    if (hasRecordPaymentErrors(methodErrors)) {
      toast({
        variant: 'destructive',
        title: 'Validation failed',
        description: 'Please complete the refund method details.',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await refundOverpaidPatientBillAction(billId, trimmed, {
        refundPaymentMethod: refund.refundPaymentMethod as PatientBillPaymentMethod,
        bank: refund.bank,
        bankId: refund.bankId || undefined,
        cardReference: refund.cardReference,
        slipReference: refund.slipReference,
        slipDate: refund.slipDate,
      });

      if (result.success) {
        toast({
          title: 'Overpayment refunded',
          description: `Refund receipt ${result.refundReceiptNumber} created for ${formatLkr(result.refundAmount)}.`,
        });
        onOpenChange(false);
        router.refresh();
      } else if (isAlreadySettledMessage(result.message)) {
        toast({
          variant: 'destructive',
          title: 'Refund failed',
          description: result.message,
        });
        await showAlreadyRefunded();
      } else {
        toast({
          variant: 'destructive',
          title: 'Refund failed',
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setLoading(false);
    }
  };

  const formAmount =
    view.kind === 'form' ? view.liveOverpaidAmount : overpaidAmount;
  const busy = loading || view.kind === 'loading';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-base">
            {view.kind === 'already_refunded'
              ? 'Overpayment already refunded'
              : 'Refund overpayment'}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-4 py-3">
          {view.kind === 'loading' ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking bill…
            </div>
          ) : null}

          {view.kind === 'error' ? (
            <p className="text-sm text-destructive py-4">{view.message}</p>
          ) : null}

          {view.kind === 'already_refunded' ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Ban className="mt-0.5 h-4 w-4 shrink-0 text-teal-800" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  Bill <strong>{billNumber}</strong> no longer has an overpayment to refund.
                  {view.refunds.length === 0
                    ? ' Refresh the page to see the latest bill status.'
                    : null}
                </p>
              </div>
              {view.refunds.map((receipt) => (
                <div
                  key={receipt.id}
                  className="rounded-md border border-teal-200/80 bg-teal-50/60 px-3 py-2 space-y-1 text-xs"
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Refund receipt</span>
                    <span className="font-mono font-medium">{receipt.receiptNumber}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold tabular-nums">
                      {formatLkr(receipt.amountPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Method</span>
                    <span>{paymentMethodLabel(receipt.paymentMethod)}</span>
                  </div>
                  {receipt.cancelReason || receipt.remarks ? (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Reason</span>
                      <span className="text-right break-words max-w-[65%]">
                        {receipt.cancelReason ||
                          receipt.remarks?.replace(/^Overpayment refund:\s*/i, '')}
                      </span>
                    </div>
                  ) : null}
                  {receipt.createdByName ? (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Processed by</span>
                      <span>{receipt.createdByName}</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {view.kind === 'form' ? (
            <>
              <p className="text-sm text-muted-foreground">
                Bill <strong>{billNumber}</strong> is over-paid by{' '}
                <strong>{formatLkr(formAmount)}</strong>. This will create a separate refund
                receipt using the method below.
              </p>

              <RefundMethodFields
                value={refund}
                onChange={(next) => {
                  setRefund(next);
                  setErrors({});
                }}
                errors={errors}
                disabled={loading}
                onBanksError={handleBanksError}
              />

              <div className="space-y-1">
                <Label htmlFor="overpayment-refund-reason" className="text-xs font-medium">
                  Refund reason (required)
                </Label>
                <Textarea
                  id="overpayment-refund-reason"
                  placeholder="e.g. Received excess payment"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                  disabled={loading}
                />
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter className="border-t bg-muted/20 px-4 py-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {view.kind === 'already_refunded' || view.kind === 'error' ? 'Close' : 'Back'}
          </Button>
          {view.kind === 'form' ? (
            <Button type="button" onClick={handleRefund} disabled={loading || !reason.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refunding…
                </>
              ) : (
                'Refund'
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
