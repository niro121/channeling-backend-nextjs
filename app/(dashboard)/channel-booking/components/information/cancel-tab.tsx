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

/** refund_to: 0 Cash, 1 Card */
const REFUND_TO_OPTIONS = [
  { value: 0, label: "Refund as CASH" },
  { value: 1, label: "Refund as CREDIT CARD" },
] as const

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
      return
    }
    setLoading(true)
    setError(null)
    getBookingDetails(selectedBooking.id)
      .then((res) => {
        if (res.success && res.data) {
          setDetails(res.data)
          setError(null)
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

  if (details.status === 2) {
    const cancelDetails = details.cancelOrRefundDetails
    return (
      <div className="flex flex-1 flex-col min-h-0 gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Ban className="size-5 text-red-600 dark:text-red-400 shrink-0" aria-hidden />
          <h3 className="text-sm font-medium text-foreground">Booking already canceled</h3>
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

  const isPaid = details.status === 1
  const refundAmount = isPaid ? details.billTotal : 0

  async function handleCancel() {
    setSubmitting(true)
    try {
      const result = await refundChannelAction({
        booking_id: selectedBooking.id,
        refund_type: 0,
        professional_fee: 0,
        hospital_fee: 0,
        refund_to: refundTo,
        remarks: remarks.trim() || undefined,
      })
      if (result.success) {
        toast({ title: "Canceled", description: "Booking has been canceled." })
        if (selectedSession?.id) {
          const res = await getBookingsBySession(selectedSession.id)
          if (res.success && res.data) {
            setBookings(res.data)
            const updated = res.data.find((b) => b.id === selectedBooking.id)
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
        <Label className="text-xs">Cancel Remarks</Label>
        <Textarea
          className="min-h-[80px] text-xs resize-y"
          placeholder="Reason for cancellation…"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>
      {isPaid && (
        <div className="space-y-1.5">
          <Label className="text-xs">Refund method</Label>
          <Select value={String(refundTo)} onValueChange={(v) => setRefundTo(Number(v))}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REFUND_TO_OPTIONS.map((opt) => (
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
        disabled={submitting}
      >
        {submitting ? "Canceling…" : isPaid ? `Cancel Booking - ${formatRs(refundAmount)}` : "Cancel Booking"}
      </Button>
    </div>
  )
}
