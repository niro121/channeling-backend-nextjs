"use client"

import { useEffect, useState } from "react"
import { getBookingDetails, getBookingsBySession, refundChannelAction } from "@/app/actions/channel-booking"
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
import { Ban } from "lucide-react"
import { CancelRefundDetailsCard } from "./cancel-refund-details-card"

/** refund_to: 0 Cash, 1 Card, 4 Agent, 5 Credit Customer, 6 E-wallet. Options depend on how booking was paid. */
function getRefundToOptionsForCancel(paymentMethod: number | undefined): { value: number; label: string }[] {
  const cash = { value: 0, label: "Refund as CASH" }
  if (paymentMethod === 4) return [cash, { value: 4, label: "Refund to Agent" }]
  if (paymentMethod === 5) return [cash, { value: 5, label: "Refund to Credit Customer" }]
  if (paymentMethod === 6) return [cash, { value: 6, label: "Refund as E-WALLET" }]
  if (paymentMethod === 1) return [cash, { value: 1, label: "Refund as CREDIT CARD" }]
  // Cash (0), Slip (2), Cheque (3): only Cash refund
  return [cash]
}

function formatRs(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function CancelTab({ onCancelSuccess }: { onCancelSuccess?: () => void }) {
  const { selectedBooking, selectedSession, setBookings, setSelectedBooking } = useChannelBooking()
  const { toast } = useToast()
  const [details, setDetails] = useState<BookingDetailsView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remarks, setRemarks] = useState("")
  const [refundTo, setRefundTo] = useState(0)
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
  const refundAmount = isPaid ? details.billTotal : 0

  async function handleCancel() {
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
              {getRefundToOptionsForCancel(details.settlement?.paymentMethod).map((opt) => (
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
        onClick={handleCancel}
        disabled={submitting || !remarks.trim()}
      >
        {submitting ? "Canceling…" : isPaid ? `Cancel Booking - ${formatRs(refundAmount)}` : "Cancel Booking"}
      </Button>
    </div>
  )
}
