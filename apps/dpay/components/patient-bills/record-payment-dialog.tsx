'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, Loader2 } from 'lucide-react';
import {
  Badge,
  Button,
  CustomDialog,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from '@archmage/ui';
import type { PatientBillDetail, PatientBillPaymentMethod } from '@/types/patient-bill';
import { PATIENT_BILL_PAYMENT_METHODS } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import {
  hasRecordPaymentErrors,
  validateRecordPaymentForm,
} from '@/lib/patient-bills/payment-validations';
import { recordPatientBillPaymentAction } from '@/app/actions/patient-bills/patient-bills.actions';

type RecordPaymentDialogProps = {
  bill: PatientBillDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function BillInfoLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

export function RecordPaymentDialog({ bill, open, onOpenChange }: RecordPaymentDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PatientBillPaymentMethod | ''>('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState<ReturnType<typeof validateRecordPaymentForm>>({});
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    setAmountReceived(String(bill.outstandingAmount));
    setPaymentMethod('cash');
    setReferenceNumber('');
    setRemarks('');
    setErrors({});
  }, [open, bill.outstandingAmount]);

  const handleSave = () => {
    const validationErrors = validateRecordPaymentForm({
      amountReceived,
      paymentMethod,
      outstandingAmount: bill.outstandingAmount,
    });
    setErrors(validationErrors);

    if (hasRecordPaymentErrors(validationErrors)) {
      toast({
        variant: 'destructive',
        title: 'Validation failed',
        description: 'Please complete all required fields.',
      });
      return;
    }

    startSaveTransition(async () => {
      const result = await recordPatientBillPaymentAction({
        billId: bill.id,
        amountReceived: Number(amountReceived),
        paymentMethod: paymentMethod as PatientBillPaymentMethod,
        referenceNumber,
        remarks,
      });

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Payment failed',
          description: result.message,
        });
        return;
      }

      toast({
        title: 'Payment recorded',
        description: `Receipt ${result.receiptNumber} has been saved.`,
      });
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <CustomDialog open={open} setOpen={onOpenChange} title="Record Payment">
      <div className="space-y-5 pt-1">
        {/* Bill Information */}
        <div className="rounded-lg border border-border/70 bg-muted/25 p-4 space-y-4">
          <SectionLabel>Bill Information</SectionLabel>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <BillInfoLabel>Receipt No</BillInfoLabel>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-emerald-700 tabular-nums">
                  Assigned on save
                </span>
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted"
                >
                  AUTO
                </Badge>
              </div>
            </div>

            <div className="space-y-1.5">
              <BillInfoLabel>BHT No</BillInfoLabel>
              <p className="text-base font-bold text-foreground tabular-nums">{bill.bxtNumber}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-md border border-border/70 bg-background">
            <div className="space-y-1 p-3 sm:p-4">
              <BillInfoLabel>Total Bill</BillInfoLabel>
              <p className="text-sm font-bold tabular-nums sm:text-base">
                {formatLkr(bill.totalAmount)}
              </p>
            </div>

            <div className="space-y-1 border-l border-border/70 p-3 sm:p-4">
              <BillInfoLabel>Total Paid</BillInfoLabel>
              <p className="text-sm font-bold tabular-nums text-emerald-700 sm:text-base">
                {formatLkr(bill.paidAmount)}
              </p>
            </div>

            <div className="space-y-1 border-l border-border/70 bg-emerald-50/90 p-3 sm:p-4">
              <BillInfoLabel>Outstanding</BillInfoLabel>
              <p className="text-sm font-bold tabular-nums text-emerald-700 sm:text-base">
                {formatLkr(bill.outstandingAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="space-y-4">
          <SectionLabel>Payment Information</SectionLabel>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount-received" className="text-sm font-normal">
                Amount Received
              </Label>
              <Input
                id="amount-received"
                type="number"
                min={0}
                step="0.01"
                value={amountReceived}
                onChange={(e) => {
                  setAmountReceived(e.target.value);
                  setErrors({});
                }}
                className={`h-10 text-right tabular-nums ${errors.amountReceived ? 'border-destructive' : ''}`}
              />
              {errors.amountReceived && (
                <p className="text-xs text-destructive">{errors.amountReceived}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-normal">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => {
                  setPaymentMethod(value as PatientBillPaymentMethod);
                  setErrors({});
                }}
              >
                <SelectTrigger
                  className={`h-10 ${errors.paymentMethod ? 'border-destructive' : ''}`}
                >
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PATIENT_BILL_PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.paymentMethod && (
                <p className="text-xs text-destructive">{errors.paymentMethod}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-number" className="text-sm font-normal">
              Reference Number
            </Label>
            <Input
              id="reference-number"
              placeholder="TXN / CHQ number"
              className="h-10"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks" className="text-sm font-normal">
              Remarks
            </Label>
            <Textarea
              id="remarks"
              placeholder="Optional notes"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-emerald-900">
          Payment date is set automatically on save. A receipt will be generated and the bill
          status will update to <strong>Partial</strong> or <strong>Paid</strong> based on the
          amount received.
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5 bg-emerald-800 hover:bg-emerald-900"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Banknote className="h-4 w-4" />
            )}
            {isSaving ? 'Saving…' : 'Save Payment'}
          </Button>
        </div>
      </div>
    </CustomDialog>
  );
}
