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
import type { BillLineItem } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { removePatientBillLineItemAction } from '@/app/actions/patient-bills/patient-bills.actions';

type RemoveLineItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  lineItem: BillLineItem | null;
};

export function RemoveLineItemDialog({
  open,
  onOpenChange,
  billId,
  lineItem,
}: RemoveLineItemDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    if (!lineItem) return;

    setLoading(true);
    try {
      const result = await removePatientBillLineItemAction(billId, lineItem.id);
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Remove failed',
          description: result.message,
        });
        return;
      }

      toast({
        title: 'Line item removed',
        description: 'Doctor charge has been marked as deleted.',
      });
      onOpenChange(false);
      router.refresh();
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove line item</DialogTitle>
        </DialogHeader>

        {lineItem ? (
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              This will remove the following charge from the bill total. The row will remain
              visible with a strikethrough so the deletion is recorded.
            </p>
            <div className="rounded-md border bg-muted/40 p-3 space-y-1">
              <p className="font-medium">{lineItem.doctorName}</p>
              <p className="text-muted-foreground">{lineItem.description}</p>
              <p className="font-semibold tabular-nums">{formatLkr(lineItem.amount)}</p>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRemove}
            disabled={loading || !lineItem}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removing…
              </>
            ) : (
              'Remove item'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
