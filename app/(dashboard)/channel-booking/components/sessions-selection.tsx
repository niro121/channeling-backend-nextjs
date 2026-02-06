"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getSessionsForChannelBooking } from "@/app/actions/sessions.action"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useChannelBooking } from "../context/channel-booking-context"
import { buildDummySessionsForDate, DUMMY_DOCTOR } from "./sessions-selection/dummy-doctor"
import { BranchSelection } from "./sessions-selection/branch-selection"
import { DateSelection } from "./sessions-selection/date-selection"
import { getBranchOptionsFromSessions } from "./sessions-selection/session-date-utils"

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

  const doctor = selectedDoctor ?? DUMMY_DOCTOR
  const isDummyDoctor = !selectedDoctor?.id || selectedDoctor.id === DUMMY_DOCTOR.id

  // Fetch Session (model) when doctor + date are set; use dummy list when doctor is dummy
  useEffect(() => {
    if (!selectedDate) {
      setSessions([])
      return
    }
    if (isDummyDoctor) {
      const dummySessions = buildDummySessionsForDate(selectedDate)
      setSessions(dummySessions)
      return
    }
    let cancelled = false
    setSessionsLoading(true)
    getSessionsForChannelBooking(doctor.id!, selectedDate)
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
  }, [selectedDate, isDummyDoctor, doctor.id, setSessions, setSessionsLoading])

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

  console.log("Sessions", sessions)

  return (
    <Card className="flex flex-col min-h-[320px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Consultant & Sessions</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 min-h-0 p-4 pt-0">
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
        <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[80px] flex-1">
          {sessionsLoading ? (
            <div className="p-2 text-sm text-muted-foreground">Loading sessions…</div>
          ) : (
            /* Sessions list: sessionsForDateAndBranch; wire to onSessionSelect */
            null
          )}
        </div>
        <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px]" />
      </CardContent>
    </Card>
  )
}
