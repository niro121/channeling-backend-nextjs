"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ReferenceSelect } from "@/components/common/reference-select";
import {
  getEligibleDoctorPaymentBookings,
  getDoctorPaymentBookingDetails,
  processDoctorPaymentAction,
} from "@/app/actions/doctor-payment/doctor-payment.actions";
import type { EligibleSessionGroup } from "@/services/doctor-payment/get-eligible-bookings.service";
import type { DoctorPaymentBookingRow } from "@/services/doctor-payment/get-doctor-payment-booking-details.service";
import type { ReferenceSelectOption } from "@/types/reference";
import { formatReferenceLabel } from "@/types/reference";
import { PAYMENT_METHOD_NAMES, RECEIPT_PAYMENT_METHOD } from "@/types/receipt";
import { useToast } from "@/components/hooks/use-toast";
import { formatLKR } from "@/lib/format-money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

function formatSessionTime(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatSessionDate(d: Date): string {
  const x = d instanceof Date ? d : new Date(d);
  return x.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const STEPS = [
  { num: 1, label: "Select doctor & date range" },
  { num: 2, label: "Select sessions" },
  { num: 3, label: "Confirm & pay" },
] as const;

function formatDateRange(from: string, to: string): string {
  if (!from || !to) return "";
  const d1 = new Date(from);
  const d2 = new Date(to);
  return `${d1.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${d2.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

const DOCTOR_NAME_TRUNCATE_LEN = 20;
function truncateDoctorName(name: string, maxLen: number = DOCTOR_NAME_TRUNCATE_LEN): string {
  const s = (name ?? "").trim();
  return s.length <= maxLen ? s : `${s.slice(0, maxLen)}…`;
}

const VALID_PAYMENT_METHODS = [
  RECEIPT_PAYMENT_METHOD.CASH,
  RECEIPT_PAYMENT_METHOD.CREDIT_CARD,
  RECEIPT_PAYMENT_METHOD.SLIP,
  RECEIPT_PAYMENT_METHOD.CHECK,
  RECEIPT_PAYMENT_METHOD.AGENT,
  RECEIPT_PAYMENT_METHOD.CREDIT,
  RECEIPT_PAYMENT_METHOD.E_WALLET,
] as const;

function getDoctorPaymentMethodOptions(methodCodes: number[]): { value: string; label: string }[] {
  const allowed = methodCodes.filter((n) => VALID_PAYMENT_METHODS.includes(n as (typeof VALID_PAYMENT_METHODS)[number]));
  if (allowed.length === 0) {
    return [{ value: String(RECEIPT_PAYMENT_METHOD.CASH), label: PAYMENT_METHOD_NAMES[RECEIPT_PAYMENT_METHOD.CASH] }];
  }
  return allowed.map((code) => ({ value: String(code), label: PAYMENT_METHOD_NAMES[code] ?? `Method ${code}` }));
}

type MakeDoctorPaymentClientProps = {
  locations: ReferenceSelectOption[];
  doctors: ReferenceSelectOption[];
  staff: ReferenceSelectOption[];
  userId: string | null;
  locationId: string | null;
  /** When provided (e.g. from channel-booking Payment tab), pre-select this doctor. */
  initialDoctorId?: string | null;
  whtPercentage: number;
  doctorPaymentMethodCodes: number[];
};

export function MakeDoctorPaymentClient({
  locations,
  doctors,
  staff,
  userId,
  locationId,
  initialDoctorId,
  whtPercentage,
  doctorPaymentMethodCodes,
}: MakeDoctorPaymentClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [doctorId, setDoctorId] = useState(initialDoctorId ?? "");
  const today = getTodayISO();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [sessions, setSessions] = useState<EligibleSessionGroup[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailRows, setDetailRows] = useState<DoctorPaymentBookingRow[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [selectedForPaymentIds, setSelectedForPaymentIds] = useState<Set<string>>(new Set());
  const [payingThisTime, setPayingThisTime] = useState("");
  const [wht, setWht] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(String(RECEIPT_PAYMENT_METHOD.CASH));
  const [slipRef, setSlipRef] = useState("");
  const [handedStaffId, setHandedStaffId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPayConfirm, setShowPayConfirm] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  const paymentMethodOptions = React.useMemo(
    () => getDoctorPaymentMethodOptions(doctorPaymentMethodCodes),
    [doctorPaymentMethodCodes]
  );

  useEffect(() => {
    const allowed = paymentMethodOptions.map((o) => o.value);
    if (allowed.length > 0 && !allowed.includes(paymentMethod)) {
      setPaymentMethod(allowed[0]);
    }
  }, [paymentMethodOptions, paymentMethod]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([e]) => setIsSticky(!e.isIntersecting),
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const whtPct = Math.max(0, Math.min(100, whtPercentage));
  const payingNum = parseFloat(payingThisTime) || 0;
  const whtAmount = wht ? (payingNum * whtPct) / 100 : 0;
  const netAmount = Math.max(0, payingNum - whtAmount);

  const currentStep = detailRows.length > 0 ? 3 : sessions.length > 0 ? 2 : 1;

  const handleLoad = async () => {
    if (!doctorId.trim() || !dateFrom || !dateTo) {
      toast({ title: "Please select doctor and date range.", variant: "destructive" });
      return;
    }
    setLoadingEligible(true);
    setSessions([]);
    setDetailRows([]);
    setSelectedSessionIds(new Set());
    try {
      const res = await getEligibleDoctorPaymentBookings(doctorId, dateFrom, dateTo);
      if (res.success) {
        setSessions(res.sessions);
        setSelectedSessionIds(new Set(res.sessions.map((s) => s.sessionId)));
      } else {
        toast({ title: res.message ?? "Failed to load.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setLoadingEligible(false);
    }
  };

  const selectedIds = React.useMemo(() => {
    const ids: string[] = [];
    for (const s of sessions) {
      if (selectedSessionIds.has(s.sessionId)) ids.push(...s.bookingIds);
    }
    return ids;
  }, [sessions, selectedSessionIds]);

  const handleProcess = async () => {
    if (selectedIds.length === 0) {
      toast({ title: "Select at least one session.", variant: "destructive" });
      return;
    }
    setLoadingDetails(true);
    setDetailRows([]);
    try {
      const res = await getDoctorPaymentBookingDetails(selectedIds);
      if (res.success) {
        setDetailRows(res.rows);
        setTotalDue(res.totalDue);
        const allIds = new Set(res.rows.map((r) => r.id));
        setSelectedForPaymentIds(allIds);
        setPayingThisTime(String(res.totalDue));
      } else {
        toast({ title: res.message ?? "Failed to load details.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setLoadingDetails(false);
    }
  };

  const totalDueForPayment = React.useMemo(
    () => detailRows.filter((r) => selectedForPaymentIds.has(r.id)).reduce((sum, r) => sum + r.paymentRs, 0),
    [detailRows, selectedForPaymentIds]
  );

  const doctorOption = doctorId ? doctors.find((d) => d.id === doctorId) : null;
  const doctorFullLabel = doctorOption ? formatReferenceLabel(doctorOption.name, doctorOption.code) : null;
  const doctorDisplayName = doctorFullLabel ? truncateDoctorName(doctorFullLabel) : null;
  const step1Detail =
    doctorId && dateFrom && dateTo
      ? [doctorDisplayName ?? "Doctor", formatDateRange(dateFrom, dateTo)].filter(Boolean).join(" · ")
      : null;
  const step1DetailTitle =
    doctorId && dateFrom && dateTo && doctorFullLabel
      ? [doctorFullLabel, formatDateRange(dateFrom, dateTo)].filter(Boolean).join(" · ")
      : step1Detail;
  const step2Detail =
    sessions.length > 0
      ? selectedSessionIds.size > 0
        ? `${selectedSessionIds.size} session${selectedSessionIds.size !== 1 ? "s" : ""} selected`
        : `${sessions.length} session${sessions.length !== 1 ? "s" : ""} with pending payment`
      : null;
  const step3Detail =
    detailRows.length > 0
      ? `${selectedForPaymentIds.size} booking${selectedForPaymentIds.size !== 1 ? "s" : ""} · ${formatLKR(totalDueForPayment)}`
      : null;
  const stepDetails = [step1Detail, step2Detail, step3Detail] as const;
  const stepDetailTitles = [step1DetailTitle, step2Detail, step3Detail] as const;

  const toggleDetailRow = (id: string) => {
    setSelectedForPaymentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllDetailRows = () => {
    if (selectedForPaymentIds.size === detailRows.length) {
      setSelectedForPaymentIds(new Set());
    } else {
      setSelectedForPaymentIds(new Set(detailRows.map((r) => r.id)));
    }
  };

  const handlePayNow = async () => {
    const idsForPayment = Array.from(selectedForPaymentIds);
    if (idsForPayment.length === 0 || !doctorId) {
      toast({ title: "Select at least one booking for payment.", variant: "destructive" });
      return;
    }
    const amount = parseFloat(payingThisTime);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Paying This Time must be a positive number.", variant: "destructive" });
      return;
    }
    if (!userId) {
      toast({ title: "You must be logged in.", variant: "destructive" });
      return;
    }
    const selectedStaff = handedStaffId.trim() ? staff.find((s) => s.id === handedStaffId) : null;
    const handedStaffName = selectedStaff ? formatReferenceLabel(selectedStaff.name, selectedStaff.code) : "";
    setSubmitting(true);
    try {
      const res = await processDoctorPaymentAction({
        bookingIds: idsForPayment,
        doctorId,
        paymentMethod: Number(paymentMethod),
        amount,
        wht,
        slip_ref: paymentMethod !== String(RECEIPT_PAYMENT_METHOD.CASH) ? slipRef : "",
        handed_staff: handedStaffName,
        locationId,
        userId,
      });
      if (res.success) {
        toast({ title: `Payment completed. Receipt: ${res.receiptNoString}` });
        router.push("/doctor-payments");
        router.refresh();
      } else {
        toast({ title: res.message ?? "Payment failed.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setSubmitting(false);
      setShowPayConfirm(false);
    }
  };

  const handlePayNowClick = () => {
    if (selectedForPaymentIds.size === 0) {
      toast({ title: "Select at least one booking for payment.", variant: "destructive" });
      return;
    }
    setShowPayConfirm(true);
  };

  const toggleSession = (sessionId: string) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedSessionIds.size === sessions.length) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(sessions.map((s) => s.sessionId)));
    }
  };

  React.useEffect(() => {
    if (detailRows.length > 0) setPayingThisTime(String(totalDueForPayment));
  }, [totalDueForPayment, detailRows.length]);

  return (
    <div className="space-y-6">
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden />
      {/* Sticky wizard bar: sits below the dashboard header (h-14) when scrolling */}
      <div
        ref={stickyRef}
        className={`
          sticky top-14 z-30 mb-4 py-3 border-b border-border bg-background
          transition-[background-color,box-shadow] duration-200
          ${isSticky
            ? "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -ml-8 w-[calc(100%+4rem)] px-8"
            : ""}
        `}
      >
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6" aria-label="Progress">
          {STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = currentStep === stepNumber;
            const isComplete = currentStep > stepNumber;
            const detail = stepDetails[index];
            const detailTitle = stepDetailTitles[index];
            return (
              <div key={step.num} className="flex items-center gap-2">
                {index > 0 && <div className="hidden sm:block h-px w-6 bg-border" aria-hidden />}
                <div
                  className={`
                    flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium
                    ${isActive ? "border-primary bg-primary text-primary-foreground" : ""}
                    ${isComplete ? "border-primary bg-primary text-primary-foreground" : ""}
                    ${!isActive && !isComplete ? "border-muted-foreground/30 text-muted-foreground" : ""}
                  `}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isComplete ? "✓" : step.num}
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                  {detail && (
                    <span className="max-w-[280px] truncate text-xs text-muted-foreground sm:max-w-[400px]" title={detailTitle ?? detail}>
                      {detail}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      <Card className={currentStep === 1 ? "ring-2 ring-primary/20" : ""}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            <span className="text-muted-foreground font-normal">Step 1 —</span> Select doctor and date range
          </CardTitle>
          <CardDescription>
            Choose the consultant and date range, then load sessions that have paid bookings with pending doctor payment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-muted/40 p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6 lg:items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Doctor</label>
                <ReferenceSelect
                  options={doctors}
                  value={doctorId}
                  onChange={setDoctorId}
                  placeholder="Select doctor"
                  allOptionValue=""
                  allOptionLabel="Select doctor"
                  className="w-[220px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="step1-date-from">From date</Label>
                <input
                  id="step1-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="step1-date-to">To date</Label>
                <input
                  id="step1-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="flex flex-col gap-2 pt-1 sm:flex-row lg:flex-col lg:pt-0">
                <Button
                  onClick={handleLoad}
                  disabled={loadingEligible}
                  className="h-10 w-full sm:w-auto lg:w-full"
                >
                  {loadingEligible ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Load sessions
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {sessions.length > 0 && (
        <Card className={currentStep === 2 ? "ring-2 ring-primary/20" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                <span className="text-muted-foreground font-normal">Step 2 —</span> Sessions with pending payment
              </CardTitle>
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedSessionIds.size === sessions.length ? "Deselect all" : "Select all"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.map((session) => {
              const isSelected = selectedSessionIds.has(session.sessionId);
              return (
                <label
                  key={session.sessionId}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSession(session.sessionId)}
                  />
                  <span className="font-medium text-sm">
                    {formatSessionDate(session.sessionDate)} · {formatSessionTime(session.sessionStartTime)}–{formatSessionTime(session.sessionEndTime)}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {session.bookingCount} booking{session.bookingCount !== 1 ? "s" : ""} · {formatLKR(session.totalAmount)}
                  </span>
                </label>
              );
            })}
            <Button className="w-full sm:w-auto" onClick={handleProcess} disabled={loadingDetails || selectedIds.length === 0}>
              {loadingDetails ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Process selected ({selectedSessionIds.size} session{selectedSessionIds.size !== 1 ? "s" : ""})
            </Button>
          </CardContent>
        </Card>
      )}

      {detailRows.length > 0 && (
        <>
          <Card className={currentStep === 3 ? "ring-2 ring-primary/20" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    <span className="text-muted-foreground font-normal">Step 3 —</span> Booking details
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total due (selected): {formatLKR(totalDueForPayment)}
                    {selectedForPaymentIds.size < detailRows.length && (
                      <span className="ml-2">({selectedForPaymentIds.size} of {detailRows.length} selected)</span>
                    )}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={toggleAllDetailRows}>
                  {selectedForPaymentIds.size === detailRows.length ? "Deselect all" : "Select all"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={detailRows.length > 0 && selectedForPaymentIds.size === detailRows.length}
                          onCheckedChange={toggleAllDetailRows}
                        />
                      </TableHead>
                      <TableHead>Bill Id</TableHead>
                      <TableHead>App No.</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Appointment Date</TableHead>
                      <TableHead className="text-right">Professional Fee</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Refunds</TableHead>
                      <TableHead className="text-right">Payment (Rs.)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedForPaymentIds.has(r.id)}
                            onCheckedChange={() => toggleDetailRow(r.id)}
                          />
                        </TableCell>
                        <TableCell>{r.billId ?? "—"}</TableCell>
                        <TableCell>{r.appNo}</TableCell>
                        <TableCell>{r.patient}</TableCell>
                        <TableCell>{r.appointmentDate}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatLKR(r.professionalFee)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatLKR(r.discount)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatLKR(r.refunds)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatLKR(r.paymentRs)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot>
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={5} className="text-right">
                        Total
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatLKR(detailRows.reduce((s, r) => s + r.professionalFee, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatLKR(detailRows.reduce((s, r) => s + r.discount, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatLKR(detailRows.reduce((s, r) => s + r.refunds, 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatLKR(detailRows.reduce((s, r) => s + r.paymentRs, 0))}
                      </TableCell>
                    </TableRow>
                  </tfoot>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <span className="text-muted-foreground font-normal">Step 3 —</span> Payment
              </CardTitle>
              <CardDescription>
                Enter amount, withholding tax and payment method. Net amount will be paid to the consultant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="rounded-lg border bg-muted/30 p-4 sm:p-5">
                <h4 className="text-sm font-medium text-foreground mb-4">Payment amount</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Paying this time (Rs.)</Label>
                    <p className="h-10 flex items-center text-sm tabular-nums font-medium">{formatLKR(totalDueForPayment)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className={whtPct === 0 ? "text-muted-foreground" : ""}>Withholding tax (WHT)</Label>
                    <div className="flex h-10 items-center gap-3">
                      <Checkbox
                        id="wht"
                        checked={wht}
                        onCheckedChange={(c) => setWht(c === true)}
                        disabled={whtPct === 0}
                      />
                      <Label
                        htmlFor="wht"
                        className={`font-normal cursor-pointer ${whtPct === 0 ? "text-muted-foreground cursor-not-allowed" : "text-muted-foreground"}`}
                      >
                        Apply WHT at {whtPct}%
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">WHT amount</Label>
                    <p className="h-10 flex items-center text-sm tabular-nums font-medium">{formatLKR(whtAmount)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Net amount (Rs.)</Label>
                    <p className="h-10 flex items-center text-base font-semibold tabular-nums">{formatLKR(netAmount)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 sm:p-5">
                <h4 className="text-sm font-medium text-foreground mb-4">Payment method & reference</h4>
                <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${paymentMethod !== String(RECEIPT_PAYMENT_METHOD.CASH) ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Payment method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger id="payment-method" className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethodOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {paymentMethod !== String(RECEIPT_PAYMENT_METHOD.CASH) && (
                    <div className="space-y-2">
                      <Label htmlFor="slip-ref">Slip reference</Label>
                      <input
                        id="slip-ref"
                        value={slipRef}
                        onChange={(e) => setSlipRef(e.target.value)}
                        placeholder="Optional"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="ref-select-Handed-to-staff">Handed to staff</Label>
                    <ReferenceSelect
                      options={staff}
                      value={handedStaffId}
                      onChange={setHandedStaffId}
                      placeholder="Select staff (optional)"
                      label="Handed to staff"
                      className="h-10 w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3 sm:pt-2">
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => router.push("/doctor-payments")}
                  disabled={submitting}
                  className="w-full sm:w-auto min-w-[100px]"
                >
                  Cancel
                </Button>
                <Button
                  size="lg"
                  onClick={handlePayNowClick}
                  disabled={submitting || selectedForPaymentIds.size === 0}
                  className="w-full sm:w-auto min-w-[140px]"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
                  You are about to process the doctor payment for {selectedForPaymentIds.size} booking{selectedForPaymentIds.size !== 1 ? "s" : ""} (total {formatLKR(totalDueForPayment)}). This will create a receipt and update the bookings. Continue?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handlePayNow} disabled={submitting} className="cursor-pointer">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Confirm & Pay — Rs. {formatLKR(totalDueForPayment)}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
