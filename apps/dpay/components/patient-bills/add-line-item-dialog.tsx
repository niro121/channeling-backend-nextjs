'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  useToast,
} from '@archmage/ui';
import type { LineItemFormErrors } from '@/types/patient-bill';
import {
  formatAmountFixed,
  hasLineItemErrors,
  parseAmountInput,
  sanitizeAmountDraftInput,
  validateLineItemInput,
} from '@/lib/patient-bills/validations';
import { addPatientBillLineItemAction } from '@/app/actions/patient-bills/patient-bills.actions';
import { DoctorSearchSelect } from './doctor-search-select';

type AddLineItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
};

export function AddLineItemDialog({ open, onOpenChange, billId }: AddLineItemDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [doctorName, setDoctorName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<LineItemFormErrors>({});
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setDoctorName('');
    setDescription('');
    setAmount('');
    setErrors({});
  }, [open]);

  const handleSave = () => {
    const parsedAmount = parseAmountInput(amount);
    const validationErrors = validateLineItemInput({
      doctorName,
      description,
      amount: parsedAmount,
    });
    setErrors(validationErrors);

    if (hasLineItemErrors(validationErrors)) {
      toast({
        variant: 'destructive',
        title: 'Validation failed',
        description: 'Please complete all required fields.',
      });
      return;
    }

    startSaveTransition(async () => {
      const result = await addPatientBillLineItemAction({
        billId,
        doctorName: doctorName.trim(),
        description: description.trim(),
        amount: parsedAmount,
      });

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Add failed',
          description: result.message,
        });
        return;
      }

      toast({
        title: 'Line item added',
        description: 'Doctor charge has been added to the bill.',
      });
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSaving) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add line item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              Doctor <span className="text-destructive">*</span>
            </Label>
            <DoctorSearchSelect
              value={doctorName}
              onChange={setDoctorName}
              placeholder="Select doctor..."
              hasError={Boolean(errors.doctorName)}
            />
            {errors.doctorName ? (
              <p className="text-xs text-destructive">{errors.doctorName}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="line-item-description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Input
              id="line-item-description"
              placeholder="Service description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={errors.description ? 'border-destructive' : ''}
              disabled={isSaving}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="line-item-amount">
              Amount (LKR) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="line-item-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(sanitizeAmountDraftInput(e.target.value))}
              onBlur={(e) => {
                const raw = e.target.value.trim();
                if (raw === '') {
                  setAmount('');
                  return;
                }
                setAmount(formatAmountFixed(parseAmountInput(raw)));
              }}
              className={errors.amount ? 'border-destructive tabular-nums' : 'tabular-nums'}
              disabled={isSaving}
            />
            {errors.amount ? <p className="text-xs text-destructive">{errors.amount}</p> : null}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding…
              </>
            ) : (
              'Add item'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
