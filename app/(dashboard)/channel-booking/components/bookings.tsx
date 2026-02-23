"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useChannelBooking } from "../context/channel-booking-context"
import { getSessionActivityForChannelBooking, type SessionActivityEntry } from "@/app/actions/channel-booking"
import { cn } from "@/lib/utils"
import { FileClock, Loader2, Mail } from "lucide-react"
import {
  formatSessionDateShort,
  formatSessionDay,
  formatSessionStartTimeDisplay,
} from "./sessions-selection/util"
import type { Session } from "@/types/booking.dashboard"
import moment from "moment"

function sessionSummary(session: Session): string {
  const date = session.date instanceof Date ? session.date : new Date(session.date)
  const start = formatSessionStartTimeDisplay(session.startTime, date)
  const end = formatSessionStartTimeDisplay(session.endTime, date)
  return `${formatSessionDateShort(date)} - ${formatSessionDay(date)} (${start} - ${end})`
}

function actionLabel(entry: SessionActivityEntry): string {
  if (entry.action === "booking.transferred") {
    const dir = entry.metadata?.direction as string | undefined
    if (dir === "outgoing") return "Transfer out"
    if (dir === "incoming") return "Transfer in"
    return "Transfer"
  }
  if (entry.action === "session.updated") return "Session updated"
  if (entry.action === "session.deleted") return "Session deleted"
  if (entry.action === "session.created.bulk") return "Sessions created (bulk)"
  return entry.action
}

export function Bookings() {
  const {
    selectedSession,
    bookings,
    bookingsLoading,
    selectedBooking,
    onBookingSelect,
    selectedTransferBookingIds,
    toggleTransferBooking,
    setSelectedTransferBookingIds,
  } = useChannelBooking()

  const [historyOpen, setHistoryOpen] = useState(false)
  const [activityLog, setActivityLog] = useState<SessionActivityEntry[] | null>(null)
  const [activityLoading, setActivityLoading] = useState(false)

  useEffect(() => {
    if (!historyOpen || !selectedSession?.id) {
      setActivityLog(null)
      return
    }
    let cancelled = false
    setActivityLoading(true)
    getSessionActivityForChannelBooking(selectedSession.id)
      .then((res) => {
        if (cancelled) return
        setActivityLog(res.success && res.data ? res.data : [])
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [historyOpen, selectedSession?.id])

  const hasSession = !!selectedSession

  return (
    <Card className="flex flex-col min-h-0 h-full">
      <CardContent className="flex flex-col flex-1 min-h-0 p-2 pt-2">
        <div className="flex items-center justify-between shrink-0 mb-1.5">
          <h3 className="font-semibold text-sm">Bookings</h3>
          <div className="flex gap-1">
            <button
              type="button"
              className="h-8 w-8 rounded-md border border-border bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 disabled:opacity-50"
              aria-label="Session history"
              title="Session history"
              disabled={!hasSession}
              onClick={() => setHistoryOpen(true)}
            >
              <FileClock className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="h-8 w-8 rounded-md border border-border bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20"
              aria-label="Email"
            >
              <Mail className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {!hasSession ? (
            <div className="flex flex-1 min-h-0 w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/20 text-sm text-muted-foreground px-2">
              Please Select a Session
            </div>
          ) : bookingsLoading ? (
            <div className="flex flex-1 min-h-0 w-full items-center justify-center py-8">
              <div
                className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-green-800"
                aria-label="Loading bookings"
              />
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-1 min-h-0 w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/20 text-sm text-muted-foreground px-2">
              No bookings for this session
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thinner border border-border rounded-md">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-muted/80 z-10">
                  <tr>
                    <th className="w-8 px-1.5 py-1.5 text-left">
                      <Checkbox
                        aria-label="Select all for transfer"
                        className="h-3.5 w-3.5"
                        checked={bookings.length > 0 && bookings.every((b) => selectedTransferBookingIds.includes(b.id))}
                        onCheckedChange={() => {
                          if (bookings.every((b) => selectedTransferBookingIds.includes(b.id))) {
                            setSelectedTransferBookingIds([])
                          } else {
                            setSelectedTransferBookingIds(bookings.map((b) => b.id))
                          }
                        }}
                      />
                    </th>
                    <th className="w-10 px-1.5 py-1.5 text-left font-medium">No</th>
                    <th className="px-1.5 py-1.5 text-left font-medium">Name</th>
                    <th className="px-1.5 py-1.5 text-left font-medium">Paid</th>
                    <th className="px-1.5 py-1.5 text-left font-medium">Agent/Staff</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const isSelected = selectedBooking?.id === b.id
                    const isTransferSelected = selectedTransferBookingIds.includes(b.id)
                    const isRefunded = b.status === 2
                    const paidLabel =
                      b.status === 1
                        ? `Paid - ${b.methodName}`
                        : `Credit - ${b.methodName}`
                    const displayName = [b.title, b.name].filter(Boolean).join(" ") || "—"
                    const agentStaff = b.agencyRef || b.staffId || "—"
                    return (
                      <tr
                        key={b.id}
                        onClick={() => onBookingSelect(isSelected ? null : b)}
                        className={cn(
                          "border-t border-border cursor-pointer transition-colors",
                          "hover:bg-primary/10",
                          isSelected && !isRefunded && "bg-primary/15",
                          isRefunded && !isSelected && "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
                          isRefunded && isSelected && "text-red-700 dark:text-red-300 bg-red-200 dark:bg-red-900/60"
                        )}
                      >
                        <td
                          className="w-8 px-1.5 py-1.5"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleTransferBooking(b.id)
                          }}
                        >
                          <Checkbox
                            checked={isTransferSelected}
                            aria-label={`Transfer ${displayName}`}
                            className="h-3.5 w-3.5 pointer-events-none"
                          />
                        </td>
                        <td className="w-10 px-1.5 py-1.5 tabular-nums">
                          {b.appointmentNo}
                        </td>
                        <td className="px-1.5 py-1.5 truncate max-w-[120px]">
                          <span className="inline-flex items-center gap-1 truncate">
                            {displayName}
                            {b.movedAt && (
                              <span className="shrink-0 inline-flex items-center rounded px-1.5 py-0 text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                Moved
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-1.5 py-1.5">
                          <span
                            className={cn(
                              b.status === 0 && "text-amber-600 font-medium"
                            )}
                          >
                            {paidLabel}
                          </span>
                        </td>
                        <td className="px-1.5 py-1.5 tabular-nums text-muted-foreground">
                          {agentStaff}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Session history
              {selectedSession && (
                <span className="block text-xs font-normal text-muted-foreground mt-1">
                  {sessionSummary(selectedSession)}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            {!selectedSession ? (
              <p className="text-xs text-muted-foreground py-2">Select a session to view history.</p>
            ) : activityLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-xs">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : activityLog && activityLog.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No activity recorded for this session.</p>
            ) : activityLog ? (
              <ul className="divide-y divide-border/40 text-xs space-y-2">
                {activityLog.map((entry) => (
                  <li key={entry.id} className="py-2 first:pt-0">
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span className="font-medium text-foreground">{actionLabel(entry)}</span>
                      <span className="text-muted-foreground">{entry.userName ?? "—"}</span>
                      <span className="text-muted-foreground">
                        {moment(entry.createdAt).format("DD MMM YYYY h:mm A")}
                      </span>
                    </div>
                    {entry.action === "booking.transferred" && entry.metadata && (
                      <div className="mt-1.5 pl-0 text-muted-foreground space-y-0.5">
                        {entry.metadata.before != null && (
                          <p className="text-[11px]">
                            <span className="font-medium text-foreground/80">From: </span>
                            {String(entry.metadata.before)}
                          </p>
                        )}
                        {entry.metadata.after != null && (
                          <p className="text-[11px]">
                            <span className="font-medium text-foreground/80">To: </span>
                            {String(entry.metadata.after)}
                          </p>
                        )}
                        {entry.metadata.remarks != null && String(entry.metadata.remarks).trim() !== "" ? (
                          <p className="text-[11px] truncate" title={String(entry.metadata.remarks)}>
                            <span className="font-medium text-foreground/80">Remarks: </span>
                            {String(entry.metadata.remarks)}
                          </p>
                        ) : null}
                      </div>
                    )}
                    {entry.action !== "booking.transferred" && entry.metadata?.remarks != null && String(entry.metadata.remarks).trim() !== "" ? (
                      <p className="text-muted-foreground mt-0.5 truncate" title={String(entry.metadata.remarks)}>
                        {String(entry.metadata.remarks)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
