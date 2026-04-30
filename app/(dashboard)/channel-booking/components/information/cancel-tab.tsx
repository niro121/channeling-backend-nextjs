"use client"

import { useEffect, useState } from "react"
import {
  getBookingDetails,
  getBookingsBySession,
  refundChannelAction,
} from "@/app/actions/channel-booking"
import type { BookingDetailsView } from "@/services/channel-booking/get-booking-details.service"
import { useChannelBooking } from "../../context/channel-booking-context"
import { useToast } from "@/components/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Ban, Banknote, CreditCard, Receipt, Wallet } from "lucide-react"
import { CancelRefundDetailsCard } from "./cancel-refund-details-card"
import {
  SAVE_PAYMENT_TYPE_CASH,
  SAVE_PAYMENT_TYPE_CREDIT_CARD,
  SAVE_PAYMENT_TYPE_E_WALLET,
  SAVE_PAYMENT_TYPE_MIXED,
  SAVE_PAYMENT_TYPE_SLIP,
} from "@/types/save-booking"

/** refund_to: 0 Cash, 1 Card, 4 Agent, 5 Credit Customer, 6 E-wallet. Options depend on how booking was paid. */
function getRefundToOptionsForCancel(
  paymentMethod: number | undefined,
  includeMixed: boolean
): { value: number; label: string }[] {
  const cash = { value: 0, label: "Refund as CASH" }
  if (paymentMethod === 4) return [cash, { value: 4, label: "Refund to Agent" }]
  if (paymentMethod === 5) return [cash, { value: 5, label: "Refund to Credit Customer" }]
  if (paymentMethod === 6) return [cash, { value: 6, label: "Refund as E-WALLET" }]
  if (paymentMethod === 1) return [cash, { value: 1, label: "Refund as CREDIT CARD" }]
  if (includeMixed) return [cash, { value: SAVE_PAYMENT_TYPE_MIXED, label: "Refund as MIXED PAYMENT" }]
  // Cash (0), Slip (2), Cheque (3): only Cash refund
  return [cash]
}

function formatRs(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type MixedLine = {
  payment_method: number
  amount: number
  bank_id?: string
  bank_name?: string
  card?: string
  slip_ref?: string
  payment_method_label?: string
}

const DEFAULT_MIXED_LINES: MixedLine[] = []

function getPaymentMethodLabel(paymentMethod: number): string {
  if (paymentMethod === SAVE_PAYMENT_TYPE_CASH) return "Cash"
  if (paymentMethod === SAVE_PAYMENT_TYPE_CREDIT_CARD) return "Credit Card"
  if (paymentMethod === SAVE_PAYMENT_TYPE_SLIP) return "Slip"
  if (paymentMethod === SAVE_PAYMENT_TYPE_E_WALLET) return "E-Wallet"
  return String(paymentMethod)
}

function getPaymentMethodIcon(paymentMethod: number) {
  if (paymentMethod === SAVE_PAYMENT_TYPE_CASH) return <Banknote className="size-4 text-emerald-600" />
  if (paymentMethod === SAVE_PAYMENT_TYPE_CREDIT_CARD) return <CreditCard className="size-4 text-sky-600" />
  if (paymentMethod === SAVE_PAYMENT_TYPE_SLIP) return <Receipt className="size-4 text-violet-600" />
  if (paymentMethod === SAVE_PAYMENT_TYPE_E_WALLET) return <Wallet className="size-4 text-amber-600" />
  return <Receipt className="size-4 text-muted-foreground" />
}

export function CancelTab({ onCancelSuccess }: { onCancelSuccess?: () => void }) {
  const { selectedBooking, selectedSession, setBookings, setSelectedBooking } = useChannelBooking()
  const { toast } = useToast()
  const [details, setDetails] = useState<BookingDetailsView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remarks, setRemarks] = useState("")
  const [refundTo, setRefundTo] = useState(0)
  const [mixedDialogOpen, setMixedDialogOpen] = useState(false)
  const [mixedLines, setMixedLines] = useState<MixedLine[]>(DEFAULT_MIXED_LINES)
  const [voidConfirmed, setVoidConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function resetMixedDialog() {
    setMixedDialogOpen(false)
    setMixedLines(DEFAULT_MIXED_LINES)
    setVoidConfirmed(false)
  }

  useEffect(() => {
    if (!selectedBooking?.id) {
      setDetails(null)
      setError(null)
      setRemarks("")
      return
    }
    setLoading(true)
    setError(null)
    getBookingDetails(selectedBooking.id)
      .then((res) => {
        if (res.success && res.data) {
          setDetails(res.data)
          setError(null)
          setRefundTo(0)
          setRemarks("")
        } else {
          setDetails(null)
          setError(res.message ?? "Failed to load")
        }
      })
      .finally(() => setLoading(false))
  }, [selectedBooking?.id])

  if (!selectedBooking) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-muted-foreground text-sm">
        Select a booking
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    )
  }

  if (error || !details) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-destructive text-sm">
        {error ?? "Failed to load booking"}
      </div>
    )
  }

  const isCanceledOrRefunded =
    details.status === 2 || details.status === 3 || (details.refund != null && details.refund !== 0)
  if (isCanceledOrRefunded) {
    const cancelDetails = details.cancelOrRefundDetails
    return (
      <div className="flex flex-1 flex-col min-h-0 gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Ban className="size-5 text-red-600 dark:text-red-400 shrink-0" aria-hidden />
          <h3 className="text-sm font-medium text-foreground">Booking already canceled or refunded</h3>
        </div>
        {cancelDetails ? (
          <CancelRefundDetailsCard details={cancelDetails} />
        ) : (
          <div className="flex-1 min-h-[120px] rounded-lg border border-dashed border-border bg-muted/20 flex items-center justify-center text-muted-foreground text-sm">
            No cancel details available.
          </div>
        )}
      </div>
    )
  }

  if (details.sessionRefundable === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-muted-foreground text-sm">
        This is a non-refundable session.
      </div>
    )
  }

  if (details.doctorPayment) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-muted-foreground text-sm text-center px-4">
        Cancel (refund) is not allowed because the doctor has already been paid for this booking.
      </div>
    )
  }

  const isPaid = details.status === 1
  const isMixedCancelEligible =
    isPaid && details.settlement?.paymentMethod === SAVE_PAYMENT_TYPE_MIXED
  const refundAmount = isPaid ? details.billTotal : 0
  const mixedTotal = mixedLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)
  const mixedRemaining = refundAmount - mixedTotal

  async function handleCancel(
    mixedPaymentLines?: Array<{
      payment_method: number
      amount: number
      bank?: { id: string; name?: string } | null
      card?: string
      slip_ref?: string
    }>
  ) {
    if (!selectedBooking) return
    if (!remarks.trim()) {
      toast({ title: "Remarks required", description: "Please enter a reason for cancellation.", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const result = await refundChannelAction({
        booking_id: selectedBooking.id,
        refund_type: 0,
        professional_fee: 0,
        hospital_fee: 0,
        refund_to: refundTo,
        payment_lines: mixedPaymentLines,
        remarks: remarks.trim(),
      })
      if (result.success) {
        toast({ title: "Canceled", description: "Booking has been canceled." })
        if (selectedSession?.id) {
          const res = await getBookingsBySession(selectedSession.id)
          if (res.success && res.data) {
            setBookings(res.data)
            const updated = res.data.find((b) => b.id === selectedBooking?.id)
            if (updated) setSelectedBooking(updated)
          }
        }
        setRemarks("")
        onCancelSuccess?.()
      } else {
        toast({ title: "Error", description: result.message ?? result.errorCode, variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Cancel failed.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMixedCancelNow() {
    const lines = mixedLines
      .map((line) => ({
        payment_method: line.payment_method,
        amount: Math.round((Number(line.amount) || 0) * 100) / 100,
        bank: line.bank_id
          ? { id: line.bank_id, name: line.bank_name }
          : null,
        card: line.card?.trim() || undefined,
        slip_ref: line.slip_ref?.trim() || undefined,
      }))
    if (lines.length < 2) {
      toast({
        title: "Mixed payment lines required",
        description: "Please add at least two payment lines.",
        variant: "destructive",
      })
      return
    }
    const invalidIdx = lines.findIndex((line) => line.amount <= 0)
    if (invalidIdx >= 0) {
      toast({
        title: "Amount required",
        description: `Mixed refund line ${invalidIdx + 1} must be greater than 0.00.`,
        variant: "destructive",
      })
      return
    }
    if (Math.abs(mixedRemaining) > 0.0001) {
      toast({
        title: "Amount mismatch",
        description: "Refund payment line total must match the full refund amount.",
        variant: "destructive",
      })
      return
    }
    await handleCancel(lines)
    resetMixedDialog()
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Cancel Remarks <span className="text-destructive">*</span></Label>
        <Textarea
          className="min-h-[80px] text-xs resize-y"
          placeholder="Reason for cancellation…"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          required
        />
      </div>
      {isPaid && (
        <div className="space-y-1.5">
          <Label className="text-xs">Refund method</Label>
          <Select
            value={String(refundTo)}
            onValueChange={(v) => setRefundTo(Number(v))}
          >
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getRefundToOptionsForCancel(details.settlement?.paymentMethod, isMixedCancelEligible).map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button
        className="w-full bg-red-600 hover:bg-red-700 text-white"
        onClick={() => {
          if (isMixedCancelEligible && refundTo === SAVE_PAYMENT_TYPE_MIXED) {
            const settlementLines = details.settlement?.paymentLines ?? []
            const mappedLines = settlementLines
              .filter((line) => Number(line.amount) > 0)
              .map((line) => ({
                payment_method: line.paymentMethod,
                payment_method_label: line.paymentMethodName,
                amount: Math.round(Number(line.amount) * 100) / 100,
                bank_id: line.bankId ?? undefined,
                bank_name: line.bank?.trim() || undefined,
                card: line.cardReference?.trim() || undefined,
                slip_ref: line.slipReference?.trim() || undefined,
              }))
            if (mappedLines.length < 2) {
              toast({
                title: "Mixed payment lines unavailable",
                description: "Original mixed payment lines were not found for this booking.",
                variant: "destructive",
              })
              return
            }
            setMixedLines(mappedLines)
            setMixedDialogOpen(true)
            return
          }
          void handleCancel()
        }}
        disabled={submitting || !remarks.trim()}
      >
        {submitting ? "Canceling…" : isPaid ? `Cancel Booking - ${formatRs(refundAmount)}` : "Cancel Booking"}
      </Button>
      <Dialog
        open={mixedDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetMixedDialog()
            return
          }
          setMixedDialogOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mixed Refund Breakdown</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {mixedLines.map((line, idx) => (
              <div key={`cancel-mixed-${idx}`} className="space-y-2 rounded-md border border-border/50 p-2.5">
                <div className="flex items-center justify-between text-xs border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">Line {idx + 1}</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                    {getPaymentMethodIcon(line.payment_method)}
                    {line.payment_method_label ?? getPaymentMethodLabel(line.payment_method)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-foreground tabular-nums text-sm">{formatRs(line.amount)}</span>
                </div>
                {line.bank_name?.trim() ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Bank</span>
                    <span className="text-foreground">{line.bank_name}</span>
                  </div>
                ) : null}
                {line.card?.trim() ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Card Ref</span>
                    <span className="text-foreground">{line.card}</span>
                  </div>
                ) : null}
                {line.slip_ref?.trim() ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Slip Ref</span>
                    <span className="text-foreground">{line.slip_ref}</span>
                  </div>
                ) : null}
              </div>
            ))}
            <div className="rounded-md border border-border/60 p-2 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Refund</span>
                <span>{formatRs(refundAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Entered</span>
                <span>{formatRs(mixedTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Remaining</span>
                <span className={Math.abs(mixedRemaining) < 0.0001 ? "text-green-600" : "text-red-600"}>
                  {formatRs(mixedRemaining)}
                </span>
              </div>
            </div>
            <div className="rounded-md border border-amber-300/70 bg-amber-50/70 dark:bg-amber-950/20 p-2.5">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="void-confirmation"
                  checked={voidConfirmed}
                  onCheckedChange={(checked) => setVoidConfirmed(checked === true)}
                />
                <label
                  htmlFor="void-confirmation"
                  className="text-xs text-foreground cursor-pointer"
                >
                  I confirm that I already voided this transaction before refunding the amount from the bank POS.
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetMixedDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleMixedCancelNow()}
              disabled={submitting || Math.abs(mixedRemaining) > 0.0001 || !voidConfirmed}
            >
              Confirm Cancel Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
