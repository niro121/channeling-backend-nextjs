'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  SearchableSelector,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  useToast,
} from '@archmage/ui';
import {
  DOCTOR_PAYMENT_METHODS,
  DOCTOR_PAYMENT_WHT_PERCENTAGE,
  type DoctorOption,
  type DoctorPaymentMethod,
  type EligibleDoctorBill,
} from '@/types/doctor-payment';
import { formatLkr } from '@/lib/patient-bills/calculations';
import {
  getEligibleBillsForDoctorAction,
  processDoctorPaymentAction,
} from '@/app/actions/doctor-payments/doctor-payments.actions';

type MakeDoctorPaymentClientProps = {
  doctors: DoctorOption[];
};

function needsReference(method: DoctorPaymentMethod) {
  return (
    method === 'bank_transfer' || method === 'cheque' || method === 'online_transfer'
  );
}

export function MakeDoctorPaymentClient({ doctors }: MakeDoctorPaymentClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [doctorName, setDoctorName] = useState('');
  const [bills, setBills] = useState<EligibleDoctorBill[]>([]);
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  const [processedBillIds, setProcessedBillIds] = useState<Set<string>>(new Set());
  const [billsLoaded, setBillsLoaded] = useState(false);
  const [loadingBills, setLoadingBills] = useState(false);

  const [applyWht, setApplyWht] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<DoctorPaymentMethod | ''>('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showPayConfirm, setShowPayConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const processedBills = useMemo(
    () => bills.filter((b) => processedBillIds.has(b.billId)),
    [bills, processedBillIds]
  );

  const totalSelectedAmount = useMemo(
    () => processedBills.reduce((sum, b) => sum + b.payableAmount, 0),
    [processedBills]
  );

  const whtAmount = applyWht
    ? Math.round(((totalSelectedAmount * DOCTOR_PAYMENT_WHT_PERCENTAGE) / 100) * 100) / 100
    : 0;
  const netAmount = Math.round((totalSelectedAmount - whtAmount) * 100) / 100;

  const selectedCount = selectedBillIds.size;
  const paymentReady = processedBillIds.size > 0;

  const handleLoadBills = () => {
    if (!doctorName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Select a doctor',
        description: 'Choose a doctor before loading bills.',
      });
      return;
    }

    setLoadingBills(true);
    startTransition(async () => {
      try {
        const rows = await getEligibleBillsForDoctorAction(doctorName);
        setBills(rows);
        setSelectedBillIds(new Set());
        setProcessedBillIds(new Set());
        setBillsLoaded(true);
        setApplyWht(false);
        setPaymentMethod('');
        setReferenceNumber('');
        setRemarks('');
        if (rows.length === 0) {
          toast({
            title: 'No eligible bills',
            description: 'No paid bills are waiting for payment for this doctor.',
          });
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Failed to load bills',
          description: error instanceof Error ? error.message : 'Something went wrong.',
        });
      } finally {
        setLoadingBills(false);
      }
    });
  };

  const toggleBill = (billId: string) => {
    setSelectedBillIds((prev) => {
      const next = new Set(prev);
      if (next.has(billId)) next.delete(billId);
      else next.add(billId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedBillIds(new Set(bills.map((b) => b.billId)));
  };

  const deselectAll = () => {
    setSelectedBillIds(new Set());
  };

  const handleProcessSelected = () => {
    if (selectedBillIds.size === 0) {
      toast({
        variant: 'destructive',
        title: 'No bills selected',
        description: 'Select at least one bill to process.',
      });
      return;
    }
    setProcessedBillIds(new Set(selectedBillIds));
  };

  const validatePaymentForm = (): string | null => {
    if (processedBillIds.size === 0) return 'Process selected bills before paying.';
    if (totalSelectedAmount <= 0) return 'Payable amount must be greater than zero.';
    if (!paymentMethod) return 'Select a payment method.';
    if (needsReference(paymentMethod) && !referenceNumber.trim()) {
      return 'Reference number is required for this payment method.';
    }
    return null;
  };

  const handlePayNowClick = () => {
    const error = validatePaymentForm();
    if (error) {
      toast({ variant: 'destructive', title: 'Cannot pay', description: error });
      return;
    }
    setShowPayConfirm(true);
  };

  const handleConfirmPay = async () => {
    const error = validatePaymentForm();
    if (error || !paymentMethod) {
      toast({ variant: 'destructive', title: 'Cannot pay', description: error ?? 'Invalid form.' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await processDoctorPaymentAction({
        doctorName,
        billIds: Array.from(processedBillIds),
        paymentMethod,
        applyWht,
        referenceNumber: referenceNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: 'Payment completed',
          description: `Receipt: ${result.receiptNumber}`,
        });
        router.push('/doctor-payments');
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Payment failed',
          description: result.message,
        });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Payment failed',
        description: err instanceof Error ? err.message : 'Something went wrong.',
      });
    } finally {
      setSubmitting(false);
      setShowPayConfirm(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Doctor Payment</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a doctor, process eligible paid bills, then pay.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 h-9"
          onClick={() => router.push('/doctor-payments')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* 1. Select Doctor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Select Doctor</CardTitle>
          <CardDescription>Choose the doctor and load unpaid bills ready for payout.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 space-y-2 min-w-0">
              <Label>Doctor</Label>
              {doctors.length > 0 ? (
                <SearchableSelector
                  label="Doctor"
                  placeholder="Search doctor..."
                  value={doctorName || '__all__'}
                  defaultValue="__all__"
                  options={doctors}
                  onChange={(value) => {
                    setDoctorName(value === '__all__' ? '' : value);
                    setBills([]);
                    setSelectedBillIds(new Set());
                    setProcessedBillIds(new Set());
                    setBillsLoaded(false);
                  }}
                  className="w-full"
                />
              ) : (
                <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                  No doctors with unpaid lines on fully paid patient bills. Pay a patient bill
                  (status Paid) first, then return here.
                </div>
              )}
            </div>
            <Button
              type="button"
              className="h-10 shrink-0"
              onClick={handleLoadBills}
              disabled={loadingBills || isPending || !doctorName}
            >
              {(loadingBills || isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Load Bills
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Bills Ready for Payment */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">2. Bills Ready for Payment</CardTitle>
              <CardDescription>
                Select bills to include in this payout. Full payable amount is used per bill.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={bills.length === 0}
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={deselectAll}
                disabled={selectedCount === 0}
              >
                Deselect All
              </Button>
            </div>
          </div>
          <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 w-fit">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Total Selected Payable Amount
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {formatLkr(
                bills
                  .filter((b) => selectedBillIds.has(b.billId))
                  .reduce((sum, b) => sum + b.payableAmount, 0)
              )}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Bill Number</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Admission Date</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead className="text-right">Doctor Fee (LKR)</TableHead>
                  <TableHead className="text-right">Discount (LKR)</TableHead>
                  <TableHead className="text-right">Refund (LKR)</TableHead>
                  <TableHead className="text-right">Payable Amount (LKR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!billsLoaded ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      Select a doctor and click Load Bills.
                    </TableCell>
                  </TableRow>
                ) : bills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No eligible bills for this doctor.
                    </TableCell>
                  </TableRow>
                ) : (
                  bills.map((bill) => (
                    <TableRow key={bill.billId}>
                      <TableCell>
                        <Checkbox
                          checked={selectedBillIds.has(bill.billId)}
                          onCheckedChange={() => toggleBill(bill.billId)}
                          aria-label={`Select ${bill.billNumber}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {bill.billNumber}
                      </TableCell>
                      <TableCell>{bill.patientName}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {format(new Date(bill.admissionDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>{bill.doctorName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatLkr(bill.doctorFee)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatLkr(bill.discount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatLkr(bill.refund)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatLkr(bill.payableAmount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {selectedCount} of {bills.length} bill(s) selected.
            </p>
            <Button
              type="button"
              onClick={handleProcessSelected}
              disabled={selectedCount === 0}
            >
              Process Selected Bills
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Payment */}
      <Card className={!paymentReady ? 'opacity-60' : undefined}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">3. Payment</CardTitle>
          <CardDescription>
            Review amounts, apply WHT if needed, then confirm payment details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Total Selected Amount</Label>
              <Input
                readOnly
                value={formatLkr(totalSelectedAmount)}
                className="tabular-nums bg-muted/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Checkbox
                  checked={applyWht}
                  onCheckedChange={(checked) => setApplyWht(checked === true)}
                  disabled={!paymentReady}
                  id="apply-wht"
                />
                <span>Apply WHT ({DOCTOR_PAYMENT_WHT_PERCENTAGE}%)</span>
              </Label>
              <Input
                readOnly
                value={formatLkr(whtAmount)}
                className="tabular-nums bg-muted/40"
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-2">
              <Label>Net Amount</Label>
              <Input
                readOnly
                value={formatLkr(netAmount)}
                className="tabular-nums font-semibold text-emerald-700 bg-muted/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentMethod || undefined}
                onValueChange={(v) => setPaymentMethod(v as DoctorPaymentMethod)}
                disabled={!paymentReady}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {DOCTOR_PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input
                placeholder="Enter reference number"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                disabled={!paymentReady}
              />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                placeholder="Enter remarks (optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={!paymentReady}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/doctor-payments')}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePayNowClick}
              disabled={!paymentReady || submitting}
            >
              Pay Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showPayConfirm} onOpenChange={setShowPayConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm doctor payment</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to process the doctor payment for {processedBillIds.size} bill
              {processedBillIds.size !== 1 ? 's' : ''}. This will create a receipt and mark the
              selected bills as paid to the doctor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Amount breakdown</span>
              {applyWht ? (
                <Badge variant="secondary" className="font-medium">
                  WHT deducted
                </Badge>
              ) : null}
            </div>
            <dl className="space-y-2 text-foreground">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Gross (paying this time)</dt>
                <dd className="tabular-nums font-medium">{formatLkr(totalSelectedAmount)}</dd>
              </div>
              {applyWht ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    Withholding tax ({DOCTOR_PAYMENT_WHT_PERCENTAGE}%)
                  </dt>
                  <dd className="tabular-nums text-muted-foreground">
                    − {formatLkr(whtAmount)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-border pt-2 mt-2">
                <dt className="font-medium">Net amount</dt>
                <dd className="tabular-nums font-semibold">{formatLkr(netAmount)}</dd>
              </div>
            </dl>
            {applyWht ? (
              <p className="text-xs text-muted-foreground leading-snug">
                Net is paid to the doctor; WHT is recorded separately for remittance.
              </p>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmPay();
              }}
              disabled={submitting}
              className="cursor-pointer"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm & Pay — {formatLkr(netAmount)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
