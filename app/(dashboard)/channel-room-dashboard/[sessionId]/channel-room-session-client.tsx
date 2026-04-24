"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { getChannelRoomSessionDetailAction } from "@/app/actions/channel-room/get-session-detail.action"
import { setChannelRoomAttendanceAction } from "@/app/actions/channel-room/set-attendance.action"
import {
  formatSessionDateShort,
  formatSessionStartTimeDisplay,
} from "../../channel-booking/components/sessions-selection/util"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/hooks/use-toast"
import type { ChannelRoomSessionDetail } from "@/services/channel-room/get-channel-room-session-detail.service"
import { useChannelRoomSocket } from "../use-channel-room-socket"

function attendanceLabel(v: number | null): string {
  if (v === 1) return "Show"
  if (v === 2) return "No-show"
  return "—"
}

export function ChannelRoomSessionClient({ sessionId }: { sessionId: string }) {
  const { toast } = useToast()
  const [detail, setDetail] = useState<ChannelRoomSessionDetail | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const today = useMemo(() => new Date(), [])

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    setErrorCode(null)
    setMessage(null)
    const res = await getChannelRoomSessionDetailAction(sessionId)
    if (res.success && res.data) {
      setDetail(res.data)
    } else {
      setDetail(null)
      if (!res.success) {
        setErrorCode("errorCode" in res ? res.errorCode ?? null : null)
        setMessage(res.message ?? "Failed to load session.")
      } else {
        setErrorCode(null)
        setMessage("Failed to load session.")
      }
    }
    if (!opts?.silent) setLoading(false)
  }, [sessionId])

  useEffect(() => {
    void load()
  }, [load])

  const subscribeLocs = useMemo(() => {
    if (!detail?.locationId) return []
    return [detail.locationId]
  }, [detail?.locationId])

  const subscribeInsts = useMemo(() => {
    if (!detail?.institution) return []
    return [detail.institution]
  }, [detail?.institution])

  useChannelRoomSocket({
    locationIds: subscribeLocs,
    institutionIds: subscribeInsts,
    enabled: Boolean(detail && errorCode !== "doctor_not_arrived"),
    onEvent: (payload) => {
      if (payload.sessionId === sessionId) void load({ silent: true })
    },
  })

  const onMark = async (bookingId: string, attendance: 1 | 2 | null) => {
    setSubmittingId(bookingId)
    try {
      const res = await setChannelRoomAttendanceAction({ bookingId, attendance })
      if (res.success) {
        toast({
          title: attendance === 1 ? "Marked show" : attendance === 2 ? "Marked no-show" : "Reverted to pending",
          description:
            attendance == null
              ? "Attendance reverted. Board number remains monotonic."
              : `Board number is now ${res.channelCurrentPatientNumber}.`,
        })
        setDetail((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            channelCurrentPatientNumber: res.channelCurrentPatientNumber,
            bookings: prev.bookings.map((b) =>
              b.id === bookingId ? { ...b, channelRoomAttendance: attendance } : b
            ),
          }
        })
      } else {
        toast({
          title: "Could not update",
          description: res.message,
          variant: "destructive",
        })
      }
    } finally {
      setSubmittingId(null)
    }
  }

  if (loading) {
    if (detail) return null
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading session...</span>
        </div>
      </div>
    )
  }

  if (!detail) {
    const isArrival = errorCode === "doctor_not_arrived"
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isArrival ? "Room unavailable" : "Cannot load room"}</CardTitle>
          <CardDescription>
            {isArrival
              ? message ??
                "Channel room opens only after doctor arrival. Use Channel Booking → Information → Arrival."
              : message ?? "Try again or return to the dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link href="/channel-room-dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Channel Room {detail.roomNumber ?? "—"}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-md bg-primary/10 text-primary px-3 py-1.5 text-base font-semibold">
              {detail.doctorName}
            </span>
            <span className="rounded-md bg-primary/10 text-primary px-3 py-1.5 text-base font-semibold">
              Room {detail.roomNumber ?? "—"}
            </span>
            <span className="rounded-md bg-primary/10 text-primary px-3 py-1.5 text-base font-semibold tabular-nums">
              {formatSessionStartTimeDisplay(detail.startTime, today)} –{" "}
              {formatSessionStartTimeDisplay(detail.endTime, today)}
            </span>
            <span className="rounded-md bg-primary/10 text-primary px-3 py-1.5 text-base font-semibold tabular-nums">
              {formatSessionDateShort(detail.startTime)}
            </span>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/channel-room-dashboard">Dashboard</Link>
        </Button>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Current patient number</CardTitle>
          <CardDescription>The current patient number being handled in this room.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-5xl font-bold tabular-nums tracking-tight">
            {detail.channelCurrentPatientNumber === 0
              ? "—"
              : String(detail.channelCurrentPatientNumber).padStart(2, "0")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Paid patients</CardTitle>
          <CardDescription>Mark show or no-show in any order.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:hidden">
            {detail.bookings.map((b) => {
              const done = b.channelRoomAttendance != null
              const busy = submittingId === b.id
              return (
                <div key={b.id} className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        No. {String(b.appointmentNo).padStart(2, "0")}
                      </p>
                      <p className="font-medium">
                        <span>{b.title}</span> <span>{b.name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">{b.receiptNoString ?? "—"}</p>
                    </div>
                    <div>
                      {done ? (
                        <Badge
                          variant={b.channelRoomAttendance === 1 ? "default" : "secondary"}
                          className="font-medium"
                        >
                          {attendanceLabel(b.channelRoomAttendance)}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Pending</span>
                      )}
                    </div>
                  </div>
                  {!done && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        disabled={busy}
                        className="min-h-10 text-base"
                        onClick={() => void onMark(b.id, 1)}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Show"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        className="min-h-10 text-base"
                        onClick={() => void onMark(b.id, 2)}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "No-show"}
                      </Button>
                    </div>
                  )}
                  {done && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      className="w-full min-h-10 text-base"
                      onClick={() => void onMark(b.id, null)}
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revert"}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="hidden sm:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-xs uppercase tracking-wide">No.</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Name / Receipt</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.bookings.map((b) => {
                  const done = b.channelRoomAttendance != null
                  const busy = submittingId === b.id
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="tabular-nums font-semibold">
                        {String(b.appointmentNo).padStart(2, "0")}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">
                            <span>{b.title}</span>{" "}
                            <span>{b.name}</span>
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {b.receiptNoString ?? "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {done ? (
                          <Badge
                            variant={b.channelRoomAttendance === 1 ? "default" : "secondary"}
                            className="font-medium"
                          >
                            {attendanceLabel(b.channelRoomAttendance)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Pending</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!done && (
                          <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              disabled={busy}
                              className="w-full sm:w-auto min-h-10 px-4 text-base sm:text-sm"
                              onClick={() => void onMark(b.id, 1)}
                            >
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Show"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              className="w-full sm:w-auto min-h-10 px-4 text-base sm:text-sm"
                              onClick={() => void onMark(b.id, 2)}
                            >
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "No-show"}
                            </Button>
                          </div>
                        )}
                        {done && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            className="w-full sm:w-auto min-h-10 px-4 text-base sm:text-sm"
                            onClick={() => void onMark(b.id, null)}
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revert"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {detail.bookings.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">No paid bookings for this session.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
