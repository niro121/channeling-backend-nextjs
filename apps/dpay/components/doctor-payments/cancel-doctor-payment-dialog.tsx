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
import { cancelDoctorPaymentAction } from '@/app/actions/doctor-payments/doctor-payments.actions';

type CancelDoctorPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  receiptNumber: string;
};

export function CancelDoctorPaymentDialog({
  open,
  onOpenChange,
  paymentId,
  receiptNumber,
}: CancelDoctorPaymentDialogProps) {
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
        description: 'Please enter a reason for cancelling this doctor payment.',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await cancelDoctorPaymentAction(paymentId, trimmed);
      if (result.success) {
        toast({
          title: 'Doctor payment cancelled',
          description: `Reversal ${result.cancelReceiptNumber} created. Linked bills can be paid again.`,
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
          <DialogTitle>Cancel doctor payment</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will cancel receipt <strong>{receiptNumber}</strong>, create a reversal receipt, and
          clear doctor payment on all linked patient bill lines so they can be paid again. This
          action cannot be undone.
        </p>
        <div className="space-y-2">
          <Label htmlFor="cancel-reason-dp">Cancel reason (required)</Label>
          <Textarea
            id="cancel-reason-dp"
            placeholder="e.g. Entered in error"
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
              'Cancel payment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
