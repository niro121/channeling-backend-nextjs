"use client"

import { useEffect, useState } from "react"
import {
  getSessionsForChannelBooking,
  getBookingsBySession,
  transferBookingsAction,
  getSessionsTransferEligibilityAction,
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
  const branch = session.location?.name ?? "—"
  return `${formatSessionDateShort(date)} - ${formatSessionDay(date)} (${start} - ${end}) [${branch}]`
}

/** True if session has same local/foreign fee as the source session (selected bookings' session). */
function sessionPriceMatches(
  sourceSession: Session | null | undefined,
  targetSession: Session
): boolean {
  if (!sourceSession) return true
  const aLocal = sourceSession.amountLocal ?? null
  const aForeign = sourceSession.amountForeign ?? null
  const bLocal = targetSession.amountLocal ?? null
  const bForeign = targetSession.amountForeign ?? null
  return aLocal === bLocal && aForeign === bForeign
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
  const [eligibilityMap, setEligibilityMap] = useState<
    Record<string, { canTransfer: boolean; previousSessionLabel?: string }>
  >({})
  const [submitting, setSubmitting] = useState(false)

  const currentSpecialityId = selectedDoctor?.specialityId ?? null
  const transferDoctorOptions = (initialData?.doctors ?? []).filter(
    (d) => d.specialityId === currentSpecialityId
  )

  // Reset transfer form when the user selects a different session in the Bookings panel
  useEffect(() => {
    setTransferDoctorId("")
    setTransferSessionId("")
    setTransferRemarks("")
    setSessionsForTransfer([])
  }, [selectedSession?.id])

  useEffect(() => {
    if (!transferDoctorId) {
      setSessionsForTransfer([])
      setTransferSessionId("")
      setEligibilityMap({})
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

  // Fetch transfer eligibility (previous session must be full) for loaded sessions
  useEffect(() => {
    if (sessionsForTransfer.length === 0) {
      setEligibilityMap({})
      return
    }
    let cancelled = false
    getSessionsTransferEligibilityAction(sessionsForTransfer.map((s) => s.id))
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) {
          setEligibilityMap(
            Object.fromEntries(
              res.data.map((e) => [
                e.sessionId,
                {
                  canTransfer: e.canTransfer,
                  previousSessionLabel: e.previousSessionLabel,
                },
              ])
            )
          )
        } else {
          setEligibilityMap({})
        }
      })
    return () => {
      cancelled = true
    }
  }, [sessionsForTransfer])

  // Clear selected session if it became disabled (price difference, leave, or previous session not full)
  useEffect(() => {
    if (!transferSessionId || !selectedSession || sessionsForTransfer.length === 0) return
    const selected = sessionsForTransfer.find((s) => s.id === transferSessionId)
    if (!selected) return
    const eligibility = eligibilityMap[transferSessionId]
    if (
      !sessionPriceMatches(selectedSession, selected) ||
      selected.status === 0 ||
      (eligibility && !eligibility.canTransfer)
    ) {
      setTransferSessionId("")
    }
  }, [selectedSession, sessionsForTransfer, transferSessionId, eligibilityMap])

  const n = selectedTransferBookingIds.length

  const todayKey = new Date().toISOString().slice(0, 10)
  const selectedSessionDateKey =
    selectedSession?.date instanceof Date
      ? selectedSession.date.toISOString().slice(0, 10)
      : selectedSession?.date
        ? new Date(selectedSession.date).toISOString().slice(0, 10)
        : null
  const isPastSelectedSession = selectedSessionDateKey != null ? selectedSessionDateKey < todayKey : false

  const canSubmit =
    n > 0 &&
    !!transferDoctorId &&
    !!transferSessionId &&
    transferRemarks.trim().length > 0 &&
    !!selectedSession?.id

  if (selectedSession && isPastSelectedSession) {
    return (
      <div className="flex flex-1 flex-col min-h-0 gap-3">
        <div className="flex items-center gap-2 shrink-0 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
          <span className="text-sm text-amber-800 dark:text-amber-200">
            Cannot transfer bookings for a past session date. Only cancel or refund is allowed.
          </span>
        </div>
      </div>
    )
  }

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
      <div>
        <h4 className="text-sm font-semibold">
          Transfer {n} Booking{n !== 1 ? "s" : ""}
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          {n} booking{n !== 1 ? "s" : ""} selected for transfer to another session.
        </p>
      </div>

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
            {sessionsForTransfer.map((s) => {
              const priceMatch = sessionPriceMatches(selectedSession, s)
              const isLeave = s.status === 0
              const eligibility = eligibilityMap[s.id]
              const previousMustBeFilled = eligibility && !eligibility.canTransfer
              const disabled =
                !priceMatch || isLeave || previousMustBeFilled || (selectedSession && s.id === selectedSession.id)
              const label = formatTransferSessionLabel(s)
              const suffix = isLeave
                ? " (Leave)"
                : !priceMatch
                  ? " (Not selectable due to price difference)"
                  : previousMustBeFilled && eligibility?.previousSessionLabel
                    ? ` (Fill previous session first: ${eligibility.previousSessionLabel})`
                    : ""
              return (
                <SelectItem
                  key={s.id}
                  value={s.id}
                  disabled={disabled}
                  className={disabled ? "opacity-60" : undefined}
                >
                  {label}{suffix}
                </SelectItem>
              )
            })}
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

      <div className="flex gap-2">
        <Button
          onClick={handleTransfer}
          disabled={!canSubmit || submitting}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {submitting ? "Transferring…" : "Transfer Now"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setTransferDoctorId("")
            setTransferSessionId("")
            setTransferRemarks("")
            setSessionsForTransfer([])
          }}
          disabled={submitting}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
