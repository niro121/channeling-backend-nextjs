'use client';

import { useState } from 'react';
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
import { formatLkr } from '@/lib/patient-bills/calculations';

type CancelPatientBillReceiptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptId: string;
  receiptNumber: string;
  amountPaid: number;
  billNumber?: string;
};

export function CancelPatientBillReceiptDialog({
  open,
  onOpenChange,
  receiptId,
  receiptNumber,
  amountPaid,
  billNumber,
}: CancelPatientBillReceiptDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    try {
      const result = await cancelPatientBillReceiptAction(receiptId, trimmed);
      if (result.success) {
        toast({
          title: 'Receipt cancelled',
          description: `${receiptNumber} (${formatLkr(result.amountVoided)}) voided. Bill outstanding is now ${formatLkr(result.outstandingAmount)}.`,
        });
        setReason('');
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
        if (!loading) {
          if (!next) setReason('');
          onOpenChange(next);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel receipt</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will cancel receipt <strong>{receiptNumber}</strong>
          {billNumber ? (
            <>
              {' '}
              on bill <strong>{billNumber}</strong>
            </>
          ) : null}{' '}
          for <strong>{formatLkr(amountPaid)}</strong>. That amount will be added back to the
          bill outstanding balance. Other receipts on the same bill are not affected. This action
          cannot be undone.
        </p>
        <div className="space-y-2">
          <Label htmlFor="cancel-reason-receipt">Cancel reason (required)</Label>
          <Textarea
            id="cancel-reason-receipt"
            placeholder="e.g. Entered in error / wrong amount"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="resize-none"
            disabled={loading}
          />
        </div>
        <DialogFooter>
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
              'Cancel receipt'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
