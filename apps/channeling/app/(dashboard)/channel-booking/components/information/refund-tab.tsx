"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  getBookingDetails,
  getBookingsBySession,
} from "@/app/actions/channel-booking"
import {
  completeApprovedRefundAction,
  requestChannelApprovalAction,
  withdrawApprovalRequestAction,
} from "@/app/actions/approval.actions"
import { APPROVAL_REQUEST_STATUS, APPROVAL_REQUEST_TYPE } from "@/types/approval-request"
import type { BookingDetailsView } from "@/services/channel-booking/get-booking-details.service"
import { useChannelBooking } from "../../context/channel-booking-context"
import { useToast } from "@/components/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Ban } from "lucide-react"
import { CancelRefundDetailsCard } from "./cancel-refund-details-card"
import { SAVE_PAYMENT_TYPE_SLIP } from "@/types/save-booking"

/** refund_to: 0 Cash, 1 Card, 2 Slip, 4 Agent, 5 Credit Customer, 6 E-wallet. Options depend on how booking was paid. */
function getRefundToOptionsForRefund(paymentMethod: number | undefined): { value: number; label: string }[] {
  const cash = { value: 0, label: "Refund as CASH" }
  if (paymentMethod === 4) return [cash, { value: 4, label: "Refund to Agent" }]
  if (paymentMethod === 5) return [cash, { value: 5, label: "Refund to Credit Customer" }]
  if (paymentMethod === 6) return [cash, { value: 6, label: "Refund as E-WALLET" }]
  if (paymentMethod === 1) return [cash, { value: 1, label: "Refund as CREDIT CARD" }]
  if (paymentMethod === SAVE_PAYMENT_TYPE_SLIP) return [cash, { value: SAVE_PAYMENT_TYPE_SLIP, label: "Refund as SLIP" }]
  // Cash (0), Cheque (3): only Cash refund
  return [cash]
}

function actionError(result: { success?: boolean; message?: string } | undefined | null): string {
  if (!result || result.success) return "Something went wrong."
  return result.message ?? "Something went wrong."
}

function formatRs(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function RefundTab({ onRefundSuccess }: { onRefundSuccess?: () => void }) {
  const { selectedBooking, selectedSession, setBookings, setSelectedBooking } = useChannelBooking()
  const { toast } = useToast()
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? null
  const [details, setDetails] = useState<BookingDetailsView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remarks, setRemarks] = useState("")
  const [refundTo, setRefundTo] = useState(0)
  const [professionalChecked, setProfessionalChecked] = useState(false)
  const [hospitalChecked, setHospitalChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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
          setProfessionalChecked(false)
          setHospitalChecked(false)
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

  if (details.status !== 1) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-muted-foreground text-sm">
        Booking must be paid before refund.
      </div>
    )
  }

  if (details.doctorPayment) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-muted-foreground text-sm text-center px-4">
        Refund is not allowed because the doctor has already been paid for this booking.
      </div>
    )
  }

  if (details.openApproval && details.openApproval.type !== APPROVAL_REQUEST_TYPE.CHANNEL_REFUND) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-muted-foreground text-sm text-center px-4">
        This booking has an open cancellation request. It must be completed, withdrawn, or rejected before a refund can be requested.
      </div>
    )
  }

  const breakdown = details.refundableBreakdown
  if (!breakdown) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-muted-foreground text-sm">
        Refund breakdown not available.
      </div>
    )
  }

  const professionalRefundable = breakdown.refundableProfessional
  const hospitalRefundable = breakdown.refundableHospital
  const totalRefund =
    (professionalChecked ? professionalRefundable : 0) + (hospitalChecked ? hospitalRefundable : 0)
  const openApproval = details.openApproval
  const isRequester = !!openApproval && openApproval.requestedById === currentUserId
  const isPendingRequest = openApproval?.status === APPROVAL_REQUEST_STATUS.PENDING
  const isApprovedRequest = openApproval?.status === APPROVAL_REQUEST_STATUS.APPROVED
  const closed = !openApproval ? details.latestClosedApproval : null

  async function refreshBooking() {
    if (!selectedBooking || !selectedSession?.id) return
    const res = await getBookingsBySession(selectedSession.id)
    if (res.success && res.data) {
      setBookings(res.data)
      const updated = res.data.find((b) => b.id === selectedBooking.id)
      if (updated) setSelectedBooking(updated)
    }
    const detailsRes = await getBookingDetails(selectedBooking.id)
    if (detailsRes.success && detailsRes.data) setDetails(detailsRes.data)
  }

  async function handleWithdraw() {
    if (!openApproval) return
    setSubmitting(true)
    try {
      const result = await withdrawApprovalRequestAction(openApproval.id)
      if (result?.success) {
        toast({ title: "Request withdrawn", description: "You can request a refund again if needed." })
        await refreshBooking()
      } else {
        toast({ title: "Error", description: actionError(result), variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Withdraw failed.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleExecute() {
    if (!selectedBooking) return
    setSubmitting(true)
    try {
      const result = await completeApprovedRefundAction(selectedBooking.id, APPROVAL_REQUEST_TYPE.CHANNEL_REFUND)
      if (result?.success) {
        toast({ title: "Refunded", description: "Refund has been recorded." })
        await refreshBooking()
        setRemarks("")
        setProfessionalChecked(false)
        setHospitalChecked(false)
        onRefundSuccess?.()
      } else {
        toast({ title: "Error", description: actionError(result), variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Refund failed.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRefund() {
    if (!selectedBooking) return
    if (totalRefund <= 0) {
      toast({ title: "Select items", description: "Select at least one refundable item.", variant: "destructive" })
      return
    }
    if (!remarks.trim()) {
      toast({ title: "Remarks required", description: "Please enter a reason for refund.", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const result = await requestChannelApprovalAction({
        booking_id: selectedBooking.id,
        type: APPROVAL_REQUEST_TYPE.CHANNEL_REFUND,
        professional_fee: professionalChecked ? professionalRefundable : 0,
        hospital_fee: hospitalChecked ? hospitalRefundable : 0,
        refund_to: refundTo,
        remarks: remarks.trim(),
      })
      if (result?.success) {
        toast({
          title: "Refund requested",
          description: "A manager must approve this before you can refund.",
        })
        await refreshBooking()
      } else {
        toast({ title: "Error", description: actionError(result), variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Request failed.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      {closed?.status === APPROVAL_REQUEST_STATUS.REJECTED && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Previous request was rejected{closed.rejectReason ? `: ${closed.rejectReason}` : "."} You can request again.
        </div>
      )}
      {isPendingRequest && (
        <div className="rounded-md border border-amber-300/70 bg-amber-50/80 dark:bg-amber-950/20 px-3 py-2 text-xs space-y-2">
          <p>
            {isRequester
              ? "Awaiting manager approval. You cannot end your shift until this is approved and completed, withdrawn, or rejected."
              : `Awaiting manager approval. Requested by ${openApproval?.requestedByName}.`}
          </p>
          {isRequester && (
            <Button variant="outline" size="sm" onClick={() => void handleWithdraw()} disabled={submitting}>
              {submitting ? "Withdrawing…" : "Withdraw request"}
            </Button>
          )}
        </div>
      )}
      {isApprovedRequest && (
        <div className="rounded-md border border-emerald-300/70 bg-emerald-50/80 dark:bg-emerald-950/20 px-3 py-2 text-xs space-y-2">
          {isRequester ? (
            <>
              <p>Approved. Complete the refund of {formatRs(openApproval?.amount ?? totalRefund)}.</p>
              <div className="flex gap-2">
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                  onClick={() => void handleExecute()}
                  disabled={submitting}
                >
                  {submitting ? "Refunding…" : `Refund ${formatRs(openApproval?.amount ?? totalRefund)}`}
                </Button>
                <Button variant="outline" size="sm" onClick={() => void handleWithdraw()} disabled={submitting}>
                  Withdraw
                </Button>
              </div>
            </>
          ) : (
            <p>Requested by {openApproval?.requestedByName} — only they can complete this refund.</p>
          )}
        </div>
      )}
      {!openApproval && (
      <>
      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Refundable items
        </Label>
        <p className="text-[11px] text-muted-foreground">
          Choose one fee only — professional or hospital (not both).
        </p>
        <div className="rounded-md border border-border/60 bg-muted/10 overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-1.5 px-2 w-8" />
                <th className="text-left py-1.5 px-2 text-[11px] font-medium text-muted-foreground">Type</th>
                <th className="text-right py-1.5 px-2 text-[11px] font-medium text-muted-foreground">Fee</th>
                <th className="text-right py-1.5 px-2 text-[11px] font-medium text-muted-foreground">Discount</th>
                <th className="text-right py-1.5 px-2 text-[11px] font-medium text-muted-foreground">Refundable</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/40">
                <td className="py-1.5 px-2">
                  <Checkbox
                    checked={professionalChecked}
                    onCheckedChange={(c) => {
                      const on = !!c
                      setProfessionalChecked(on)
                      if (on) setHospitalChecked(false)
                    }}
                    disabled={professionalRefundable <= 0}
                  />
                </td>
                <td className="py-1.5 px-2 text-foreground">Professional Fee</td>
                <td className="py-1.5 px-2 text-right text-foreground">{formatRs(breakdown.professionalFee)}</td>
                <td className="py-1.5 px-2 text-right text-muted-foreground">{formatRs(breakdown.professionalDiscount)}</td>
                <td className="py-1.5 px-2 text-right text-foreground">{formatRs(professionalRefundable)}</td>
              </tr>
              <tr className="border-b border-border/40 last:border-0">
                <td className="py-1.5 px-2">
                  <Checkbox
                    checked={hospitalChecked}
                    onCheckedChange={(c) => {
                      const on = !!c
                      setHospitalChecked(on)
                      if (on) setProfessionalChecked(false)
                    }}
                    disabled={hospitalRefundable <= 0}
                  />
                </td>
                <td className="py-1.5 px-2 text-foreground">Hospital Fee</td>
                <td className="py-1.5 px-2 text-right text-foreground">{formatRs(breakdown.hospitalFee)}</td>
                <td className="py-1.5 px-2 text-right text-muted-foreground">{formatRs(breakdown.hospitalDiscount)}</td>
                <td className="py-1.5 px-2 text-right text-foreground">{formatRs(hospitalRefundable)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Refund Remarks <span className="text-destructive">*</span></Label>
        <Textarea
          className="min-h-[60px] text-xs resize-y"
          placeholder="Reason for refund…"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Refund method</Label>
        <Select
          value={String(refundTo)}
          onValueChange={(v) => setRefundTo(Number(v))}
        >
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="Refund as…" />
          </SelectTrigger>
          <SelectContent>
            {getRefundToOptionsForRefund(details.settlement?.paymentMethod).map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        className="w-full bg-red-600 hover:bg-red-700 text-white"
        onClick={handleRefund}
        disabled={submitting || totalRefund <= 0 || !remarks.trim()}
      >
        {submitting ? "Requesting…" : `Request refund ${formatRs(totalRefund)}`}
      </Button>
      </>
      )}
    </div>
  )
}
