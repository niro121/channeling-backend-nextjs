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
  useToast,
} from '@archmage/ui';
import { closePatientBillAction } from '@/app/actions/patient-bills/patient-bills.actions';

type ClosePatientBillDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  billNumber: string;
};

export function ClosePatientBillDialog({
  open,
  onOpenChange,
  billId,
  billNumber,
}: ClosePatientBillDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClose = async () => {
    setLoading(true);
    try {
      const result = await closePatientBillAction(billId);
      if (result.success) {
        toast({
          title: 'Patient bill closed',
          description: `${billNumber} has been closed and can no longer be edited. Cancel Bill remains available to void it with refunds.`,
        });
        onOpenChange(false);
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Close failed',
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close patient bill</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to close this bill? Once closed, it cannot be edited or
          have payments/receipts changed individually. You can still cancel the bill later
          to void it and issue refund receipts. Paid and over-paid bills can be closed.
        </p>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            No
          </Button>
          <Button type="button" onClick={handleClose} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Closing…
              </>
            ) : (
              'Yes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
