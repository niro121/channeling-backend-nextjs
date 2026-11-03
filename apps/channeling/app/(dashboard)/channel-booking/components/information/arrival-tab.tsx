"use client"

import { useEffect, useState } from "react"
import {
  getSessionArrivalState,
  getRoomsForArrival,
  setDoctorArrivalAction,
  getSessionsForChannelBooking,
  type RoomOption,
} from "@/app/actions/channel-booking"
import type { SessionArrivalState } from "@/services/channel-booking/get-session-arrival-state.service"
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
import moment from "moment"

function formatTimeUnix(unixStr: string): string {
  const sec = parseInt(unixStr, 10)
  if (Number.isNaN(sec)) return unixStr
  return moment.unix(sec).format("YYYY-MM-DD hh:mm A")
}

export function ArrivalTab() {
  const { selectedSession, selectedDoctor, setSessions } = useChannelBooking()
  const { toast } = useToast()

  const [state, setState] = useState<SessionArrivalState | null>(null)
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [roomId, setRoomId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const locationId = selectedSession?.locationId ?? null

  useEffect(() => {
    if (!selectedSession?.id) {
      setState(null)
      setRooms([])
      setRoomId("")
      return
    }
    let cancelled = false
    setLoading(true)
    getSessionArrivalState(selectedSession.id)
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) {
          setState(res.data)
          setRoomId(res.data.roomId ?? "")
        } else {
          setState(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedSession?.id])

  useEffect(() => {
    if (!locationId) {
      setRooms([])
      return
    }
    let cancelled = false
    getRoomsForArrival(locationId)
      .then((res) => {
        if (cancelled) return
        setRooms(res.success && res.data ? res.data : [])
      })
    return () => {
      cancelled = true
    }
  }, [locationId])

  useEffect(() => {
    if (!roomId) return
    const room = rooms.find((r) => r.id === roomId)
    if (!room?.occupied) return
    setRoomId("")
    toast({
      variant: "destructive",
      title: "Room unavailable",
      description: "Selected room is already occupied. Please choose another room.",
    })
  }, [rooms, roomId, toast])

  const arrivalCount = state?.doctorArrivalTime?.length ?? 0
  const departureCount = state?.doctorDepatureTime?.length ?? 0
  const isArrived = arrivalCount > departureCount
  const selectedRoom = rooms.find((r) => r.id === roomId)
  const lastArrival = state?.doctorArrivalTime?.length
    ? state.doctorArrivalTime[state.doctorArrivalTime.length - 1]
    : null
  const lastDeparture = state?.doctorDepatureTime?.length
    ? state.doctorDepatureTime[state.doctorDepatureTime.length - 1]
    : null

  const canSetArrival =
    !isArrived && !!roomId?.trim() && !!selectedSession?.id && !selectedRoom?.occupied
  const canSetDeparture = isArrived && !!selectedSession?.id

  const refreshSessions = async () => {
    if (!selectedDoctor?.id) return
    const res = await getSessionsForChannelBooking(selectedDoctor.id, new Date())
    if (res.success && res.data) setSessions(res.data)
  }

  const handleSetArrival = async () => {
    if (!canSetArrival || !selectedSession?.id) return
    setSubmitting(true)
    try {
      const result = await setDoctorArrivalAction({
        sessionId: selectedSession.id,
        arrivalStatus: 1,
        roomId: roomId.trim(),
      })
      if (result.success && result.session) {
        setState({
          doctorArrivalTime: result.session.doctorArrivalTime,
          doctorDepatureTime: result.session.doctorDepatureTime,
          roomId: result.session.roomId,
          locationId: state?.locationId ?? null,
        })
        toast({
          title: "Doctor Arrival set",
          description: "Linked sessions updated. SMS sent to patients.",
        })
        await refreshSessions()
      } else {
        toast({
          title: "Failed",
          description: result.success === false ? result.message : "Could not set arrival.",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetDeparture = async () => {
    if (!canSetDeparture || !selectedSession?.id) return
    setSubmitting(true)
    try {
      const result = await setDoctorArrivalAction({
        sessionId: selectedSession.id,
        arrivalStatus: 0,
      })
      if (result.success && result.session) {
        setState({
          doctorArrivalTime: result.session.doctorArrivalTime,
          doctorDepatureTime: result.session.doctorDepatureTime,
          roomId: state?.roomId ?? null,
          locationId: state?.locationId ?? null,
        })
        toast({
          title: "Doctor Departure set",
          description: "Linked sessions updated. SMS sent to patients.",
        })
        await refreshSessions()
      } else {
        toast({
          title: "Failed",
          description: result.success === false ? result.message : "Could not set departure.",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!selectedSession) {
    return (
      <div className="w-full flex-1 min-h-full rounded border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-sm px-4 text-center bg-secondary/50">
        Select a session to set Doctor Arrival or Doctor Departure.
      </div>
    )
  }

  const sessionDate = selectedSession.date instanceof Date ? selectedSession.date : new Date(selectedSession.date)
  const isToday = moment(sessionDate).format("YYYY-MM-DD") === moment().format("YYYY-MM-DD")
  if (!isToday) {
    return (
      <div className="w-full flex-1 min-h-full rounded border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-sm px-4 text-center bg-secondary/50">
        Arrival and departure can only be set for today&apos;s sessions.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Doctor Arrival / Doctor Departure</h4>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <>
          {(lastArrival || lastDeparture) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {lastArrival && (
                <span title="Latest arrival">Arrival: {formatTimeUnix(lastArrival.time)}</span>
              )}
              {lastDeparture && (
                <span title="Latest departure">Departure: {formatTimeUnix(lastDeparture.time)}</span>
              )}
            </div>
          )}

          {!isArrived ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Room</label>
                <Select
                  value={roomId}
                  onValueChange={setRoomId}
                  disabled={rooms.length === 0}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder={rooms.length === 0 ? "No rooms" : "Select room"} />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id} disabled={r.occupied}>
                        {r.number}
                        {r.occupied ? " (Occupied)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSetArrival}
                disabled={!canSetArrival || submitting}
                className="w-full bg-green-600 text-white hover:bg-green-700"
              >
                {submitting ? "Setting…" : "Set Doctor Arrival"}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSetDeparture}
              disabled={!canSetDeparture || submitting}
              className="w-full bg-red-600 text-white hover:bg-red-700"
            >
              {submitting ? "Setting…" : "Set Doctor Departure"}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
