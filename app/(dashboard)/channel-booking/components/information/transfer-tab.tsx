"use client"

import { useEffect, useState } from "react"
import {
  getSessionsForChannelBooking,
  getBookingsBySession,
  transferBookingsAction,
} from "@/app/actions/channel-booking"
import type { Session } from "@/types/booking.dashboard"
import { useChannelBooking } from "../../context/channel-booking-context"
import { useToast } from "@/components/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  formatSessionDateShort,
  formatSessionDay,
  formatSessionStartTimeDisplay,
} from "../sessions-selection/util"

function formatTransferSessionLabel(session: Session): string {
  const date = session.date instanceof Date ? session.date : new Date(session.date)
  const start = formatSessionStartTimeDisplay(session.startTime, date)
  const end = formatSessionStartTimeDisplay(session.endTime, date)
  return `${formatSessionDateShort(date)} - ${formatSessionDay(date)} (${start} - ${end})`
}

export function TransferTab() {
  const {
    selectedSession,
    selectedDoctor,
    initialData,
    bookings,
    selectedTransferBookingIds,
    clearTransferSelection,
    setBookings,
    refreshBookingDetails,
    setActiveInformationTab,
  } = useChannelBooking()
  const { toast } = useToast()

  const [transferDoctorId, setTransferDoctorId] = useState<string>("")
  const [transferSessionId, setTransferSessionId] = useState<string>("")
  const [transferRemarks, setTransferRemarks] = useState("")
  const [sessionsForTransfer, setSessionsForTransfer] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const currentSpecialityId = selectedDoctor?.specialityId ?? null
  const transferDoctorOptions = (initialData?.doctors ?? []).filter(
    (d) => d.specialityId === currentSpecialityId
  )

  useEffect(() => {
    if (!transferDoctorId) {
      setSessionsForTransfer([])
      setTransferSessionId("")
      return
    }
    let cancelled = false
    setSessionsLoading(true)
    getSessionsForChannelBooking(transferDoctorId, new Date())
      .then((res) => {
        if (cancelled) return
        setSessionsForTransfer(res.success && res.data ? res.data : [])
        setTransferSessionId("")
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [transferDoctorId])

  const n = selectedTransferBookingIds.length
  const canSubmit =
    n > 0 &&
    !!transferDoctorId &&
    !!transferSessionId &&
    transferRemarks.trim().length > 0 &&
    !!selectedSession?.id

  const handleTransfer = async () => {
    if (!canSubmit || !selectedSession?.id) return
    setSubmitting(true)
    try {
      const result = await transferBookingsAction({
        bookingIds: selectedTransferBookingIds,
        doctorId: transferDoctorId,
        sessionId: transferSessionId,
        currentSessionId: selectedSession.id,
        remarks: transferRemarks.trim(),
      })
      if (result.success) {
        toast({
          title: "Transfer complete",
          description: `${n} booking${n !== 1 ? "s" : ""} transferred successfully. SMS sent.`,
        })
        setTransferDoctorId("")
        setTransferSessionId("")
        setTransferRemarks("")
        clearTransferSelection()
        refreshBookingDetails()
        if (selectedSession?.id) {
          const res = await getBookingsBySession(selectedSession.id)
          if (res.success && res.data) setBookings(res.data)
        }
        setActiveInformationTab("booking")
      } else {
        toast({
          title: "Transfer failed",
          description: result.message ?? result.errorCode ?? "Please try again.",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Transfer failed.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!selectedSession) {
    return (
      <div className="min-h-[120px] rounded border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm px-4 text-center">
        Select a session in the Bookings panel to transfer bookings.
      </div>
    )
  }

  if (n === 0) {
    return (
      <div className="min-h-[120px] rounded border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm px-4 text-center">
        Please select the bookings you would like to transfer using the{"\u00A0"}
        <strong>tick boxes</strong>.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">
        Transfer {n} Booking{n !== 1 ? "s" : ""}
      </h4>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Transfer to doctor
        </label>
        <Select
          value={transferDoctorId}
          onValueChange={setTransferDoctorId}
          disabled={!currentSpecialityId}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select doctor (same speciality)" />
          </SelectTrigger>
          <SelectContent>
            {transferDoctorOptions.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {[d.title, d.name].filter(Boolean).join(" ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Transfer to session
        </label>
        <Select
          value={transferSessionId}
          onValueChange={setTransferSessionId}
          disabled={!transferDoctorId || sessionsLoading}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue
              placeholder={
                sessionsLoading ? "Loading sessions…" : "Select session (from today)"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {sessionsForTransfer.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {formatTransferSessionLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Transfer remarks <span className="text-destructive">*</span>
        </label>
        <Textarea
          placeholder="Enter transfer remarks (required)"
          value={transferRemarks}
          onChange={(e) => setTransferRemarks(e.target.value)}
          className="min-h-[80px] resize-y"
          required
        />
      </div>

      <Button
        onClick={handleTransfer}
        disabled={!canSubmit || submitting}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {submitting ? "Transferring…" : "Transfer Now"}
      </Button>
    </div>
  )
}
