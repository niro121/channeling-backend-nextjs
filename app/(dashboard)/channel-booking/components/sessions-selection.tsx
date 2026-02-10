"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getSessionsForChannelBooking } from "@/app/actions/booking.dashboard.action"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useChannelBooking } from "../context/channel-booking-context"
import { BranchSelection } from "./sessions-selection/branch-selection"
import { DateSelection } from "./sessions-selection/date-selection"
import { getBranchOptionsFromSessions } from "./sessions-selection/session-date-utils"
import { Loader } from "lucide-react"
import { cn} from "@/lib/utils"
import { formatSessionTime, getSessionDisplayName } from "./sessions-selection/util"

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

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

  const hasDoctor = Boolean(selectedDoctor?.id)

  // When doctor is cleared, reset date/location and clear sessions
  useEffect(() => {
    if (!hasDoctor) {
      setSelectedDate(null)
      setSelectedLocationId(null)
      setSessions([])
      return
    }
  }, [hasDoctor, setSessions])

  // Fetch Session (model) when doctor + date are set
  useEffect(() => {
    if (!hasDoctor || !selectedDoctor?.id || !selectedDate) {
      if (!hasDoctor || !selectedDate) setSessions([])
      return
    }
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
  }, [hasDoctor, selectedDoctor?.id, selectedDate, setSessions, setSessionsLoading])

  const branchOptions = useMemo(
    () => getBranchOptionsFromSessions(sessions),
    [sessions]
  )

  const sessionsForDateAndBranch = useMemo(() => {
    if (!selectedLocationId) return sessions
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

  return (
    <Card className="flex flex-col min-h-[320px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Consultant & Sessions</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 min-h-0 p-4 pt-0">
        {!hasDoctor ? (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border bg-muted/20 min-h-[200px] text-sm text-muted-foreground">
            Select a consultant first
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <DateSelection
                value={selectedDate}
                onChange={handleDateChange}
                placeholder="Select date"
                className="min-w-[180px]"
              />
              <BranchSelection
                options={branchOptions}
                value={selectedLocationId}
                onChange={setSelectedLocationId}
                placeholder="Select branch"
                disabled={!selectedDate || branchOptions.length === 0}
                className="min-w-[160px]"
              />
            </div>
            <div className="rounded-md border border-border bg-muted/20 min-h-[80px] flex-1 overflow-auto">
              {sessionsLoading ? (
                <div className="w-full h-full min-h-[80px] flex items-center justify-center">
                  <Loader className="w-5 h-5 text-muted-foreground animate-spin" />
                </div>
              ) : sessionsForDateAndBranch.length === 0 ? (
                <div className="w-full h-full min-h-[80px] flex items-center justify-center text-sm text-muted-foreground">
                  No sessions for this date
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {sessionsForDateAndBranch.map((session) => {
                    const isSelected = selectedSession?.id === session.id
                    return (
                      <li key={session.id}>
                        <button
                          type="button"
                          onClick={() => onSessionSelect(isSelected ? null : session)}
                          className={cn(
                            "w-full flex items-center justify-between cursor-pointer gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60",
                            isSelected && "bg-primary/10 text-primary font-medium"
                          )}
                        >
                          <span className="truncate">
                            {getSessionDisplayName(session)}
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {formatSessionTime(session.startTime, session.date)} –{" "}
                            {formatSessionTime(session.endTime, session.date)}
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
