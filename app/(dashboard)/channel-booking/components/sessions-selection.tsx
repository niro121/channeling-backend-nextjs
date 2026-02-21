"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { getSessionsForChannelBooking } from "@/app/actions/channel-booking"
import { Card, CardContent } from "@/components/ui/card"
import { useChannelBooking } from "../context/channel-booking-context"
import { usePermissions } from "@/components/hooks/use-permissions"
import { BranchSelection } from "./sessions-selection/branch-selection"
import { DateSelection } from "./sessions-selection/date-selection"
import type { BranchOption } from "./sessions-selection/session-date-utils"
import { cn } from "@/lib/utils"
import {
  formatSessionDateShort,
  formatSessionDay,
  formatLocalFee,
  formatSessionStartTimeDisplay,
  isSessionWeekend,
  padTwo,
} from "./sessions-selection/util"

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function SessionsSelection() {
  const {
    initialData,
    selectedDoctor,
    selectedSession,
    sessions,
    sessionsLoading,
    setSessions,
    setSessionsLoading,
    onSessionSelect,
    updateSessionInList,
  } = useChannelBooking()
  const { has } = usePermissions()
  const canChangeDate = has("channel-booking-date", "view")

  // Default date to today on page load; reset to today when doctor is cleared (or when user has no change-date permission)
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date())
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

  // When user has no "Change Date" permission, keep date fixed to today
  useEffect(() => {
    if (!canChangeDate) {
      setSelectedDate(new Date())
    }
  }, [canChangeDate])

  const allLocations: BranchOption[] = initialData?.locations ?? []
  const allowedIds = initialData?.userBookingLocationIds ?? []
  const filteredLocations: BranchOption[] = useMemo(() => {
    if (allowedIds.length === 0) return allLocations
    return allLocations.filter((loc) => allowedIds.includes(loc.id))
  }, [allLocations, allowedIds])

  const hasDoctor = Boolean(selectedDoctor?.id)
  const userDefaultLocationId = initialData?.userDefaultLocationId ?? null
  const userUseDefaultLocation = initialData?.userUseDefaultLocation ?? false

  // When doctor is cleared, reset location and clear sessions; keep date as today
  useEffect(() => {
    if (!hasDoctor) {
      setSelectedLocationId(null)
      setSessions([])
      setSelectedDate(new Date())
      return
    }
  }, [hasDoctor, setSessions])

  const defaultLocationToSelect = useMemo(() => {
    if (!userUseDefaultLocation || !userDefaultLocationId) return null
    return filteredLocations.some((l) => l.id === userDefaultLocationId)
      ? userDefaultLocationId
      : null
  }, [userUseDefaultLocation, userDefaultLocationId, filteredLocations])

  const defaultLocationRef = useRef<string | null>(null)
  defaultLocationRef.current = defaultLocationToSelect

  // On doctor or date change: set branch to default (if "Use default location") or null, clear selected session, then fetch sessions
  useEffect(() => {
    if (!hasDoctor || !selectedDoctor?.id || !selectedDate) {
      if (!hasDoctor || !selectedDate) setSessions([])
      return
    }
    setSelectedLocationId(defaultLocationRef.current)
    onSessionSelect(null)
    let cancelled = false
    setSessionsLoading(true)
    getSessionsForChannelBooking(selectedDoctor.id, selectedDate)
      .then((res) => {
        if (cancelled) return
        setSessions(res.success && res.data ? res.data : [])
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hasDoctor, selectedDoctor?.id, selectedDate, setSessions, setSessionsLoading, onSessionSelect])

  // Socket: subscribe to session updates for current doctor (one room per doctor so changing date still gets updates)
  const socketRef = useRef<Socket | null>(null)
  const lastSubscribedRef = useRef<string | null>(null)
  useEffect(() => {
    if (typeof window === "undefined") return
    const doctorId = selectedDoctor?.id ?? null

    if (!doctorId) {
      if (socketRef.current) {
        if (lastSubscribedRef.current) {
          socketRef.current.emit("channel-booking:unsubscribe", { doctorId: lastSubscribedRef.current })
          lastSubscribedRef.current = null
        }
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const socket = io(window.location.origin, { path: "/socket.io", addTrailingSlash: false })
    socketRef.current = socket

    const payload = { doctorId }
    const doSubscribe = () => {
      if (lastSubscribedRef.current) {
        socket.emit("channel-booking:unsubscribe", { doctorId: lastSubscribedRef.current })
      }
      lastSubscribedRef.current = doctorId
      socket.emit("channel-booking:subscribe", payload)
      if (process.env.NODE_ENV !== "production") {
        console.log("[sessions-selection] subscribed to room", payload)
      }
    }
    if (socket.connected) {
      doSubscribe()
    } else {
      socket.once("connect", doSubscribe)
    }

    const onSessionUpdate = (data: { sessionId: string; appointmentNo?: number; paidCount?: number; pendingCount?: number }) => {
      if (process.env.NODE_ENV !== "production") {
        console.log("[sessions-selection] session-update received", { doctorId, data })
      }
      if (data?.sessionId) {
        updateSessionInList(data.sessionId, {
          ...(data.appointmentNo !== undefined && { appointmentNo: data.appointmentNo }),
          ...(data.paidCount !== undefined && { paidCount: data.paidCount }),
          ...(data.pendingCount !== undefined && { pendingCount: data.pendingCount }),
        })
      }
    }
    socket.on("session-update", onSessionUpdate)

    return () => {
      if (lastSubscribedRef.current) {
        socket.emit("channel-booking:unsubscribe", { doctorId: lastSubscribedRef.current })
        lastSubscribedRef.current = null
      }
      socket.off("session-update", onSessionUpdate)
      socket.disconnect()
      socketRef.current = null
    }
  }, [selectedDoctor?.id, updateSessionInList])

  // Filter sessions by selected location (show only when location is selected)
  const sessionsForDateAndBranch = useMemo(() => {
    if (!selectedLocationId) return []
    return sessions.filter(
      (s) => (s.locationId ?? s.location?.id) === selectedLocationId
    )
  }, [sessions, selectedLocationId])

  const handleDateChange = useCallback(
    (date: Date | null) => {
      setSelectedDate(date)
      setSelectedLocationId(null)
    },
    []
  )

  /* Sessions list: stretches to fill space, scrolls when needed; no border, no rounding */
  const sessionsListClasses = "flex-1 min-h-0 overflow-y-auto scrollbar-thinner bg-muted/20"

  return (
    <Card className="flex flex-col min-h-0 h-full">
      <CardContent className="flex flex-col flex-1 min-h-0 gap-2 p-2 pt-2">
        {!hasDoctor ? (
          <div className="flex flex-1 min-h-0 w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
            Please select a consultant
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 items-center shrink-0">
              {canChangeDate && (
                <DateSelection
                  value={selectedDate}
                  onChange={handleDateChange}
                  placeholder="Select date"
                  className="min-w-[130px]"
                />
              )}
              <BranchSelection
                options={filteredLocations}
                value={selectedLocationId}
                onChange={setSelectedLocationId}
                placeholder="Select branch"
                disabled={!hasDoctor}
                className="min-w-[120px]"
              />
            </div>
            <div className={cn(sessionsListClasses)}>
              {sessionsLoading ? (
                <div
                  className="w-full flex-1 min-h-[44px] flex items-center justify-center py-8"
                  role="status"
                  aria-label="Loading sessions"
                >
                  <div
                    className="h-12 w-12 animate-spin rounded-full border-2 border-gray-300 border-t-green-800"
                    aria-hidden="true"
                  />
                </div>
              ) : !selectedLocationId ? (
                <div className="w-full min-h-[44px] flex items-center justify-center py-4 text-sm text-red-600">
                  Please select a branch
                </div>
              ) : sessionsForDateAndBranch.length === 0 ? (
                <div className="w-full min-h-[44px] py-4 flex items-center justify-center text-sm text-muted-foreground">
                  No sessions for this date
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {sessionsForDateAndBranch.map((session) => {
                    const isSelected = selectedSession?.id === session.id
                    const start = session.startingPatientNumber ?? 1
                    const max = session.maxPatientNumber ?? 10
                    const capacity = max - start + 1
                    const currentCount = (session.paidCount ?? 0) + (session.pendingCount ?? 0)
                    const lastAppointmentNo = session.appointmentNo ?? 0
                    const nextAppointmentNo = lastAppointmentNo === 0 ? start : lastAppointmentNo + 1
                    const isFull = currentCount >= capacity
                    const isWeekend = isSessionWeekend(session.date)
                    const isOnLeave = session.status === 0
                    return (
                      <li key={session.id}>
                        <button
                          type="button"
                          onClick={() => onSessionSelect(isSelected ? null : session)}
                          className={cn(
                            "w-full grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] gap-x-2 sm:gap-x-3 items-center px-2 py-1.5 text-left text-xs transition-colors duration-150 cursor-pointer",
                            "hover:bg-primary hover:text-primary-foreground",
                            isSelected && "bg-primary text-primary-foreground font-medium"
                          )}
                        >
                          <span className={cn("shrink-0 tabular-nums", isWeekend && "font-bold")}>
                            {formatSessionDay(session.date)}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {formatSessionDateShort(session.date)}
                          </span>
                          <span className="shrink-0 tabular-nums text-left">
                            {formatSessionStartTimeDisplay(session.startTime, session.date)}
                          </span>
                          <span className="shrink-0 tabular-nums text-right min-w-[4rem]">
                            {formatLocalFee(session.amountLocal)}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            <span className={cn(!isSelected && "text-green-600 dark:text-green-400")}>
                              {currentCount}
                            </span>
                            ({capacity})
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {isFull ? (
                              <span className={cn(!isSelected && "text-red-600 dark:text-red-400 font-medium")}>
                                Full
                              </span>
                            ) : (
                              <>
                                #
                                <span className={cn(!isSelected && "text-red-600 dark:text-red-400 font-medium")}>
                                  {padTwo(nextAppointmentNo)}
                                </span>
                              </>
                            )}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {isOnLeave ? "ON LEAVE" : `**${session.pendingCount ?? 0}**`}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
