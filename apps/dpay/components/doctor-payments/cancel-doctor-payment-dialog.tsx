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
import { cancelDoctorPaymentAction } from '@/app/actions/doctor-payments/doctor-payments.actions';
import type { PatientBillPaymentMethod } from '@/types/patient-bill';
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
} from '@/components/receipts/refund-method-fields';

type CancelDoctorPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  receiptNumber: string;
  /** Original payout method — used for allowed refund methods. */
  originalPaymentMethod?: string | null;
};

function defaultRefundValues(original?: string | null): RefundMethodValues {
  return emptyRefundMethodValues(defaultRefundPaymentMethod(original));
}

export function CancelDoctorPaymentDialog({
  open,
  onOpenChange,
  paymentId,
  receiptNumber,
  originalPaymentMethod,
}: CancelDoctorPaymentDialogProps) {
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
        description: 'Please enter a reason for cancelling this doctor payment.',
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
      const result = await cancelDoctorPaymentAction({
        paymentId,
        cancelReason: trimmed,
        refundPaymentMethod: refund.refundPaymentMethod as PatientBillPaymentMethod,
        bank: refund.bank,
        bankId: refund.bankId || undefined,
        cardReference: refund.cardReference,
        slipReference: refund.slipReference,
        slipDate: refund.slipDate,
      });
      if (result.success) {
        toast({
          title: 'Doctor payment cancelled',
          description: `Refund ${result.cancelReceiptNumber} (${paymentMethodLabel(refund.refundPaymentMethod)}) created. Linked bills can be paid again.`,
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
          <DialogTitle className="text-base">Cancel doctor payment</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Cancel <strong>{receiptNumber}</strong>, create a linked refund receipt (
            <strong>DPAY-REF</strong>), and clear doctor payment on linked patient bill lines.
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
            <Label htmlFor="cancel-reason-dp" className="text-xs font-medium">
              Cancel reason (required)
            </Label>
            <Textarea
              id="cancel-reason-dp"
              placeholder="e.g. Entered in error"
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
