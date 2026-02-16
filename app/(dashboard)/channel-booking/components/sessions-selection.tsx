"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getLocationsForChannelBooking,
  getSessionsForChannelBooking,
} from "@/app/actions/channel-booking"
import { Card, CardContent } from "@/components/ui/card"
import { useChannelBooking } from "../context/channel-booking-context"
import { BranchSelection } from "./sessions-selection/branch-selection"
import { DateSelection } from "./sessions-selection/date-selection"
import type { BranchOption } from "./sessions-selection/session-date-utils"
import { cn } from "@/lib/utils"
import {
  formatSessionDateShort,
  formatSessionDay,
  formatLocalFee,
  formatSessionStartTimeDisplay,
} from "./sessions-selection/util"

export function SessionsSelection() {
  const {
    selectedDoctor,
    selectedSession,
    sessions,
    sessionsLoading,
    setSessions,
    setSessionsLoading,
    onSessionSelect,
  } = useChannelBooking()

  // Default date to today on page load; reset to today when doctor is cleared
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date())
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [allLocations, setAllLocations] = useState<BranchOption[]>([])

  const hasDoctor = Boolean(selectedDoctor?.id)

  // Load all locations on mount (for branch dropdown)
  useEffect(() => {
    let cancelled = false
    getLocationsForChannelBooking()
      .then((res) => {
        if (cancelled || !res.success || !res.data) return
        setAllLocations(res.data)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // When doctor is cleared, reset location and clear sessions; keep date as today
  useEffect(() => {
    if (!hasDoctor) {
      setSelectedLocationId(null)
      setSessions([])
      setSelectedDate(new Date())
      return
    }
  }, [hasDoctor, setSessions])

  // On doctor or date change: reset branch, clear selected session, then fetch sessions for doctor + date
  useEffect(() => {
    if (!hasDoctor || !selectedDoctor?.id || !selectedDate) {
      if (!hasDoctor || !selectedDate) setSessions([])
      return
    }
    setSelectedLocationId(null)
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
              <DateSelection
                value={selectedDate}
                onChange={handleDateChange}
                placeholder="Select date"
                className="min-w-[130px]"
              />
              <BranchSelection
                options={allLocations}
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
                    const maxPatients = session.maxPatientNumber ?? 10
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
                          <span className="shrink-0 tabular-nums">
                            {formatSessionDay(session.date)}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {formatSessionDateShort(session.date)}
                          </span>
                          <span className="shrink-0 tabular-nums text-left">
                            {formatSessionStartTimeDisplay(session.startTime, session.date)}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {formatLocalFee(session.amountLocal)}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            0({maxPatients})
                          </span>
                          <span className="shrink-0 text-primary font-normal">
                            #
                          </span>
                          <span className="shrink-0 tabular-nums">
                            **0**
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
