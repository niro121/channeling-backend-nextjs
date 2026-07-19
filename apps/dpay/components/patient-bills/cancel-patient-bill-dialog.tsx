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
import { cancelPatientBillAction } from '@/app/actions/patient-bills/patient-bills.actions';

type CancelPatientBillDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  billNumber: string;
  receiptCount?: number;
};

export function CancelPatientBillDialog({
  open,
  onOpenChange,
  billId,
  billNumber,
  receiptCount = 0,
}: CancelPatientBillDialogProps) {
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
        description: 'Please enter a reason for cancelling this patient bill.',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await cancelPatientBillAction(billId, trimmed);
      if (result.success) {
        const voided = result.voidedReceiptCount;
        toast({
          title: 'Patient bill cancelled',
          description:
            voided > 0
              ? `${billNumber} cancelled. ${voided} linked receipt${voided === 1 ? '' : 's'} voided.`
              : `${billNumber} cancelled.`,
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
          <DialogTitle>Cancel patient bill</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will cancel bill <strong>{billNumber}</strong>
          {receiptCount > 0
            ? ` and void ${receiptCount} linked receipt${receiptCount === 1 ? '' : 's'}`
            : ''}
          . Payment and edit will no longer be allowed. This action cannot be undone.
        </p>
        <div className="space-y-2">
          <Label htmlFor="cancel-reason-bill">Cancel reason (required)</Label>
          <Textarea
            id="cancel-reason-bill"
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
              'Cancel bill'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
