'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, Loader2 } from 'lucide-react';
import { RECEIPT_PAYMENT_METHOD } from '@archmage/shared';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import type { PatientBillDetail, PatientBillPaymentMethod, PatientBillReceipt } from '@/types/patient-bill';
import { PATIENT_BILL_PAYMENT_METHODS } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { formatAmountFixed, parseAmountInput } from '@/lib/patient-bills/validations';
import {
  hasRecordPaymentErrors,
  validateRecordPaymentForm,
} from '@/lib/patient-bills/payment-validations';
import {
  paymentMethodFromSelectValue,
  paymentMethodSelectValue,
} from '@/lib/receipts/helpers';
import { recordPatientBillPaymentAction } from '@/app/actions/patient-bills/patient-bills.actions';
import { getChannelingBanksAction } from '@/app/actions/channeling/banks.actions';
import type { ChannelingBankOption } from '@/services/channeling/get-banks.service';
import { PaymentDetailsDialog } from './payment-details-dialog';

type RecordPaymentDialogProps = {
  bill: PatientBillDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function FieldLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function BankSelect({
  banks,
  loading,
  value,
  error,
  onChange,
}: {
  banks: ChannelingBankOption[];
  loading: boolean;
  value: string;
  error?: string;
  onChange: (bankId: string, bankName: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">Bank</Label>
      <Select
        value={value || undefined}
        onValueChange={(bankId) => {
          const selected = banks.find((b) => b.id === bankId);
          onChange(bankId, selected?.name ?? '');
        }}
        disabled={loading || banks.length === 0}
      >
        <SelectTrigger className={`h-8 text-sm ${error ? 'border-destructive' : ''}`}>
          <SelectValue placeholder={loading ? 'Loading banks…' : 'Select bank'} />
        </SelectTrigger>
        <SelectContent>
          {banks.map((bank) => (
            <SelectItem key={bank.id} value={bank.id}>
              {bank.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
      {!loading && banks.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No banks found. Check CHANNELING_DATABASE_URL / Channeling bank tags.
        </p>
      ) : null}
    </div>
  );
}

export function RecordPaymentDialog({ bill, open, onOpenChange }: RecordPaymentDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PatientBillPaymentMethod | ''>(
    RECEIPT_PAYMENT_METHOD.CASH
  );
  const [bankId, setBankId] = useState('');
  const [bank, setBank] = useState('');
  const [banks, setBanks] = useState<ChannelingBankOption[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [cardReference, setCardReference] = useState('');
  const [slipReference, setSlipReference] = useState('');
  const [slipDate, setSlipDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState<ReturnType<typeof validateRecordPaymentForm>>({});
  const [isSaving, startSaveTransition] = useTransition();
  const [printReceipt, setPrintReceipt] = useState<PatientBillReceipt | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const showCard = paymentMethod === RECEIPT_PAYMENT_METHOD.CREDIT_CARD;
  const showSlip = paymentMethod === RECEIPT_PAYMENT_METHOD.SLIP;
  const showCheque = paymentMethod === RECEIPT_PAYMENT_METHOD.CHECK;
  const showEWallet = paymentMethod === RECEIPT_PAYMENT_METHOD.E_WALLET;
  const showBank = showCard || showSlip || showCheque;

  useEffect(() => {
    if (!open) return;

    setAmountReceived(formatAmountFixed(bill.outstandingAmount));
    setPaymentMethod(RECEIPT_PAYMENT_METHOD.CASH);
    setBankId('');
    setBank('');
    setCardReference('');
    setSlipReference('');
    setSlipDate('');
    setRemarks('');
    setErrors({});
    setBanksLoading(false);
  }, [open, bill.outstandingAmount]);

  useEffect(() => {
    if (!open || !showBank) return;
    if (banks.length > 0) return;

    let cancelled = false;
    setBanksLoading(true);

    void getChannelingBanksAction()
      .then((result) => {
        if (cancelled) return;
        if (!result.success || !result.data) {
          toast({
            variant: 'destructive',
            title: 'Could not load banks',
            description: result.message ?? 'Failed to load banks from Channeling.',
          });
          setBanks([]);
          return;
        }
        setBanks(result.data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast({
          variant: 'destructive',
          title: 'Could not load banks',
          description: error instanceof Error ? error.message : 'Failed to load banks.',
        });
        setBanks([]);
      })
      .finally(() => {
        if (!cancelled) setBanksLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Intentionally omit banksLoading — including it cancels the in-flight request and sticks on "Loading…".
    // eslint-disable-next-line react-hooks/exhaustive-deps -- banks.length gates refetch
  }, [open, showBank, toast]);

  const handleBankChange = (nextBankId: string, nextBankName: string) => {
    setBankId(nextBankId);
    setBank(nextBankName);
    setErrors({});
  };

  const handleSave = () => {
    const validationErrors = validateRecordPaymentForm({
      amountReceived,
      paymentMethod,
      outstandingAmount: bill.outstandingAmount,
      bank,
      cardReference,
      slipReference,
      slipDate,
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
        bank,
        bankId: bankId || undefined,
        cardReference,
        slipReference,
        slipDate,
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

      const saved = result.receipt;
      setPrintReceipt({
        id: saved.id,
        receiptNumber: saved.receiptNumber,
        amountPaid: saved.amountPaid,
        paymentMethod: saved.paymentMethod,
        referenceNumber: saved.referenceNumber,
        bank: saved.bank,
        bankId: saved.bankId,
        cardReference: saved.cardReference,
        slipReference: saved.slipReference,
        slipDate: saved.slipDate,
        locationId: saved.locationId,
        locationCode: saved.locationCode,
        locationName: saved.locationName,
        remarks: saved.remarks,
        outstandingAfter: saved.outstandingAfter,
        paymentDate: saved.paymentDate,
        status: (saved.status as PatientBillReceipt['status']) || 'active',
        createdByName: saved.createdByName,
      });
      setPrintOpen(true);
      router.refresh();
    });
  };

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSaving) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-base">Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 px-4 py-3">
          <div className="rounded-md border border-border/70 bg-muted/20 p-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <FieldLabel>Receipt No</FieldLabel>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-emerald-700">Auto</span>
                  <Badge
                    variant="secondary"
                    className="h-4 px-1 text-[9px] font-medium bg-muted text-muted-foreground hover:bg-muted"
                  >
                    AUTO
                  </Badge>
                </div>
              </div>
              <div className="space-y-0.5">
                <FieldLabel>BHT No</FieldLabel>
                <p className="text-sm font-semibold tabular-nums">{bill.bxtNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 overflow-hidden rounded-md border border-border/70 bg-background">
              <div className="space-y-0.5 p-2">
                <FieldLabel>Total</FieldLabel>
                <p className="text-xs font-bold tabular-nums">{formatLkr(bill.totalAmount)}</p>
              </div>
              <div className="space-y-0.5 border-l border-border/70 p-2">
                <FieldLabel>Paid</FieldLabel>
                <p className="text-xs font-bold tabular-nums text-emerald-700">
                  {formatLkr(bill.paidAmount)}
                </p>
              </div>
              <div className="space-y-0.5 border-l border-border/70 bg-emerald-50/90 p-2">
                <FieldLabel>Due</FieldLabel>
                <p className="text-xs font-bold tabular-nums text-emerald-700">
                  {formatLkr(bill.outstandingAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="amount-received" className="text-xs font-medium">
                Amount Received
              </Label>
              <Input
                id="amount-received"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => {
                  setAmountReceived(e.target.value);
                  setErrors({});
                }}
                onBlur={() => {
                  const raw = amountReceived.trim();
                  if (raw === '') return;
                  setAmountReceived(formatAmountFixed(parseAmountInput(raw)));
                }}
                className={`h-8 text-right text-sm tabular-nums ${errors.amountReceived ? 'border-destructive' : ''}`}
              />
              {errors.amountReceived ? (
                <p className="text-[11px] text-destructive">{errors.amountReceived}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Payment Method</Label>
              <Select
                value={paymentMethodSelectValue(paymentMethod)}
                onValueChange={(value) => {
                  setPaymentMethod(paymentMethodFromSelectValue(value));
                  setBankId('');
                  setBank('');
                  setCardReference('');
                  setSlipReference('');
                  setSlipDate('');
                  setErrors({});
                }}
              >
                <SelectTrigger
                  className={`h-8 text-sm ${errors.paymentMethod ? 'border-destructive' : ''}`}
                >
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PATIENT_BILL_PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={String(method.value)}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.paymentMethod ? (
                <p className="text-[11px] text-destructive">{errors.paymentMethod}</p>
              ) : null}
            </div>
          </div>

          {showCard ? (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="card-last4" className="text-xs font-medium">
                  Last 4 Digits
                </Label>
                <Input
                  id="card-last4"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="1234"
                  className={`h-8 text-sm tabular-nums ${errors.cardReference ? 'border-destructive' : ''}`}
                  value={cardReference}
                  onChange={(e) => {
                    setCardReference(e.target.value.replace(/\D/g, '').slice(0, 4));
                    setErrors({});
                  }}
                />
                {errors.cardReference ? (
                  <p className="text-[11px] text-destructive">{errors.cardReference}</p>
                ) : null}
              </div>
              <BankSelect
                banks={banks}
                loading={banksLoading}
                value={bankId}
                error={errors.bank}
                onChange={handleBankChange}
              />
            </div>
          ) : null}

          {showSlip || showCheque ? (
            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="slip-ref" className="text-xs font-medium">
                  {showCheque ? 'Cheque No' : 'Slip Ref'}
                </Label>
                <Input
                  id="slip-ref"
                  placeholder={showCheque ? 'Cheque number' : 'Bank reference'}
                  className={`h-8 text-sm ${errors.slipReference ? 'border-destructive' : ''}`}
                  value={slipReference}
                  onChange={(e) => {
                    setSlipReference(e.target.value);
                    setErrors({});
                  }}
                />
                {errors.slipReference ? (
                  <p className="text-[11px] text-destructive">{errors.slipReference}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor="slip-date" className="text-xs font-medium">
                  {showCheque ? 'Cheque Date' : 'Slip Date'}
                </Label>
                <Input
                  id="slip-date"
                  type="date"
                  className={`h-8 text-sm ${errors.slipDate ? 'border-destructive' : ''}`}
                  value={slipDate}
                  onChange={(e) => {
                    setSlipDate(e.target.value);
                    setErrors({});
                  }}
                />
                {errors.slipDate ? (
                  <p className="text-[11px] text-destructive">{errors.slipDate}</p>
                ) : null}
              </div>
              <BankSelect
                banks={banks}
                loading={banksLoading}
                value={bankId}
                error={errors.bank}
                onChange={handleBankChange}
              />
            </div>
          ) : null}

          {showEWallet ? (
            <div className="space-y-1">
              <Label htmlFor="ewallet-ref" className="text-xs font-medium">
                E-Wallet Reference
              </Label>
              <Input
                id="ewallet-ref"
                placeholder="Transaction reference"
                className={`h-8 text-sm ${errors.cardReference ? 'border-destructive' : ''}`}
                value={cardReference}
                onChange={(e) => {
                  setCardReference(e.target.value);
                  setErrors({});
                }}
              />
              {errors.cardReference ? (
                <p className="text-[11px] text-destructive">{errors.cardReference}</p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="remarks" className="text-xs font-medium">
              Remarks
            </Label>
            <Textarea
              id="remarks"
              placeholder="Optional notes"
              rows={2}
              className="min-h-[56px] resize-none text-sm"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <p className="text-[11px] leading-snug text-muted-foreground">
            Payment date is set on save. Bill status updates to Partially Paid or Paid based on amount.
          </p>
        </div>

        <DialogFooter className="border-t bg-muted/20 px-4 py-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5 bg-emerald-800 hover:bg-emerald-900"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Banknote className="h-3.5 w-3.5" />
            )}
            {isSaving ? 'Saving…' : 'Save Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <PaymentDetailsDialog
      receipt={printReceipt}
      bxtNumber={bill.bxtNumber}
      open={printOpen}
      onOpenChange={(next) => {
        setPrintOpen(next);
        if (!next) setPrintReceipt(null);
      }}
      title="Payment recorded"
    />
    </>
  );
}
