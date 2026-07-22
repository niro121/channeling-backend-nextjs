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
import { cancelPatientBillAction } from '@/app/actions/patient-bills/patient-bills.actions';
import {
  hasRecordPaymentErrors,
  validatePaymentMethodFields,
} from '@/lib/patient-bills/payment-validations';
import {
  defaultRefundPaymentMethod,
  getAllowedRefundPaymentMethodsForReceipts,
} from '@/lib/patient-bills/refund-method-rules';
import {
  emptyRefundMethodValues,
  RefundMethodFields,
  type RefundMethodValues,
} from '@/components/receipts/refund-method-fields';

type CancelPatientBillDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  billNumber: string;
  receiptCount?: number;
  /** Payment methods of active receipts being voided (limits refund choices). */
  originalPaymentMethods?: Array<string | number | null | undefined>;
};

export function CancelPatientBillDialog({
  open,
  onOpenChange,
  billId,
  billNumber,
  receiptCount = 0,
  originalPaymentMethods = [],
}: CancelPatientBillDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const hasReceipts = receiptCount > 0;
  const allowedMethods = getAllowedRefundPaymentMethodsForReceipts(
    originalPaymentMethods
  );
  const originalMethodsKey = originalPaymentMethods.map(String).join('|');
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState<RefundMethodValues>(() =>
    emptyRefundMethodValues(
      originalPaymentMethods.length === 1
        ? defaultRefundPaymentMethod(originalPaymentMethods[0])
        : allowedMethods[0]
    )
  );
  const [errors, setErrors] = useState<ReturnType<typeof validatePaymentMethodFields>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason('');
    const allowed = getAllowedRefundPaymentMethodsForReceipts(originalPaymentMethods);
    setRefund(
      emptyRefundMethodValues(
        originalPaymentMethods.length === 1
          ? defaultRefundPaymentMethod(originalPaymentMethods[0])
          : allowed[0]
      )
    );
    setErrors({});
    // originalMethodsKey avoids resetting on new array identity each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, originalMethodsKey]);

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
        description: 'Please enter a reason for cancelling this patient bill.',
      });
      return;
    }

    if (hasReceipts) {
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
    }

    setLoading(true);
    try {
      const result = await cancelPatientBillAction(
        billId,
        trimmed,
        hasReceipts
          ? {
              refundPaymentMethod: refund.refundPaymentMethod,
              bank: refund.bank,
              bankId: refund.bankId || undefined,
              cardReference: refund.cardReference,
              slipReference: refund.slipReference,
              slipDate: refund.slipDate,
            }
          : undefined
      );
      if (result.success) {
        const voided = result.voidedReceiptCount;
        toast({
          title: 'Patient bill cancelled',
          description:
            voided > 0
              ? `${billNumber} cancelled. ${voided} linked receipt${voided === 1 ? '' : 's'} voided.`
              : `${billNumber} cancelled.`,
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
          <DialogTitle className="text-base">Cancel patient bill</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-4 py-3">
          <p className="text-sm text-muted-foreground">
            This will cancel bill <strong>{billNumber}</strong>
            {hasReceipts
              ? ` and void ${receiptCount} linked receipt${receiptCount === 1 ? '' : 's'} with refund receipts`
              : ''}
            . Payment and edit will no longer be allowed.
          </p>

          {hasReceipts ? (
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
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="cancel-reason-bill" className="text-xs font-medium">
              Cancel reason (required)
            </Label>
            <Textarea
              id="cancel-reason-bill"
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
              'Cancel bill'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
