'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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
import { refundOverpaidPatientBillAction } from '@/app/actions/patient-bills/patient-bills.actions';
import type { PatientBillPaymentMethod } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import {
  hasRecordPaymentErrors,
  validatePaymentMethodFields,
} from '@/lib/patient-bills/payment-validations';
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

  useEffect(() => {
    if (!open) return;
    setReason('');
    setRefund(emptyRefundMethodValues());
    setErrors({});
  }, [open]);

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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-base">Refund overpayment</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Bill <strong>{billNumber}</strong> is over-paid by{' '}
            <strong>{formatLkr(overpaidAmount)}</strong>. This will create a separate refund
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
        </div>

        <DialogFooter className="border-t bg-muted/20 px-4 py-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Back
          </Button>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
