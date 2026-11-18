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
import { cancelPatientBillReceiptAction } from '@/app/actions/receipts/receipts.actions';
import type { PatientBillPaymentMethod } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import {
  hasRecordPaymentErrors,
  validatePaymentMethodFields,
} from '@/lib/patient-bills/payment-validations';
import {
  defaultRefundPaymentMethod,
  getAllowedRefundPaymentMethods,
} from '@/lib/patient-bills/refund-method-rules';
import { paymentMethodLabel } from '@/lib/receipts/helpers';
import {
  emptyRefundMethodValues,
  RefundMethodFields,
  type RefundMethodValues,
} from './refund-method-fields';

type CancelPatientBillReceiptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptId: string;
  receiptNumber: string;
  amountPaid: number;
  billNumber?: string;
  /** Original payment method — used as default refund method when valid. */
  originalPaymentMethod?: PatientBillPaymentMethod | string | null;
};

function defaultRefundValues(
  original?: PatientBillPaymentMethod | string | null
): RefundMethodValues {
  return emptyRefundMethodValues(defaultRefundPaymentMethod(original));
}

export function CancelPatientBillReceiptDialog({
  open,
  onOpenChange,
  receiptId,
  receiptNumber,
  amountPaid,
  billNumber,
  originalPaymentMethod,
}: CancelPatientBillReceiptDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState<RefundMethodValues>(() =>
    defaultRefundValues(originalPaymentMethod)
  );
  const [errors, setErrors] = useState<ReturnType<typeof validatePaymentMethodFields>>({});
  const [loading, setLoading] = useState(false);
  const allowedMethods = getAllowedRefundPaymentMethods(originalPaymentMethod);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setRefund(defaultRefundValues(originalPaymentMethod));
    setErrors({});
  }, [open, originalPaymentMethod]);

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

  const handleCancel = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast({
        variant: 'destructive',
        title: 'Reason required',
        description: 'Please enter a reason for cancelling this receipt.',
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
      const result = await cancelPatientBillReceiptAction(receiptId, trimmed, {
        refundPaymentMethod: refund.refundPaymentMethod,
        bank: refund.bank,
        bankId: refund.bankId || undefined,
        cardReference: refund.cardReference,
        slipReference: refund.slipReference,
        slipDate: refund.slipDate,
      });
      if (result.success) {
        toast({
          title: 'Receipt cancelled',
          description: `Refund ${result.cancelReceiptNumber} (${paymentMethodLabel(refund.refundPaymentMethod)}) created for ${receiptNumber} (${formatLkr(result.amountVoided)}). Bill outstanding is now ${formatLkr(result.outstandingAmount)}.`,
        });
        onOpenChange(false);
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Cancel failed',
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
          <DialogTitle className="text-base">Cancel receipt</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Cancel <strong>{receiptNumber}</strong>
            {billNumber ? (
              <>
                {' '}
                on bill <strong>{billNumber}</strong>
              </>
            ) : null}{' '}
            for <strong>{formatLkr(amountPaid)}</strong> and create a separate refund receipt.
            Choose how the amount is being refunded.
          </p>

          <RefundMethodFields
            value={refund}
            onChange={(next) => {
              setRefund(next);
              setErrors({});
            }}
            errors={errors}
            disabled={loading}
            allowedMethods={allowedMethods}
            onBanksError={handleBanksError}
          />

          <div className="space-y-1">
            <Label htmlFor="cancel-reason-receipt" className="text-xs font-medium">
              Cancel reason (required)
            </Label>
            <Textarea
              id="cancel-reason-receipt"
              placeholder="e.g. Entered in error / wrong amount"
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
          <Button
            type="button"
            variant="destructive"
            onClick={handleCancel}
            disabled={loading || !reason.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling…
              </>
            ) : (
              'Cancel & refund'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
