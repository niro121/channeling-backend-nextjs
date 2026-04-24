"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { getChannelBookingInitialData } from "@/app/actions/channel-booking"
import { getChannelRoomDashboardAction } from "@/app/actions/channel-room/get-dashboard.action"
import { getChannelRoomDoctorSessionsAction } from "@/app/actions/channel-room/get-doctor-sessions.action"
import { forceReleaseRoom } from "@/app/actions/room.actions"
import { BranchSelection } from "../channel-booking/components/sessions-selection/branch-selection"
import type { BranchOption } from "../channel-booking/components/sessions-selection/session-date-utils"
import {
  formatSessionDateShort,
  formatSessionStartTimeDisplay,
} from "../channel-booking/components/sessions-selection/util"
import { DoctorDropdown } from "./doctor-dropdown"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ChannelRoomDashboardRow } from "@/services/channel-room/get-channel-room-dashboard.service"
import type { ChannelBookingInitialData } from "@/services/channel-booking/get-initial-data.service"
import type { ChannelRoomDoctorSessionOption } from "@/services/channel-room/get-channel-room-doctor-sessions.service"
import { useChannelRoomSocket } from "./use-channel-room-socket"
import { usePermissions } from "@/components/hooks/use-permissions"
import { useToast } from "@/components/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function ChannelRoomDashboardClient() {
  const [initialData, setInitialData] = useState<ChannelBookingInitialData | null>(null)
  const [rows, setRows] = useState<ChannelRoomDashboardRow[]>([])
  const [socketScopes, setSocketScopes] = useState<{
    institutionIds: number[]
    locationIds: string[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [pickerDoctorId, setPickerDoctorId] = useState<string>("")
  const [pickerSessions, setPickerSessions] = useState<ChannelRoomDoctorSessionOption[]>([])
  const [pickerSessionsLoading, setPickerSessionsLoading] = useState(false)
  const [pickerSessionId, setPickerSessionId] = useState<string>("")
  const [visitRoomDialogOpen, setVisitRoomDialogOpen] = useState(false)
  const [releasingRoomId, setReleasingRoomId] = useState<string | null>(null)
  const [releaseConfirmOpen, setReleaseConfirmOpen] = useState(false)
  const [releaseAgree, setReleaseAgree] = useState(false)
  const [releaseTarget, setReleaseTarget] = useState<{ roomId: string; roomNumber: string | null } | null>(null)
  const { has } = usePermissions()
  const { toast } = useToast()

  const today = useMemo(() => new Date(), [])

  const filteredLocations: BranchOption[] = useMemo(() => {
    const all = initialData?.locations ?? []
    const allowed = initialData?.userBookingLocationIds ?? []
    if (allowed.length === 0) return all.map((l) => ({ id: l.id, name: l.name }))
    return all.filter((l) => allowed.includes(l.id)).map((l) => ({ id: l.id, name: l.name }))
  }, [initialData])

  const branchOptions: BranchOption[] = useMemo(
    () => [{ id: "__all__", name: "All branches" }, ...filteredLocations],
    [filteredLocations]
  )

  useEffect(() => {
    if (!initialData) return
    if (initialData.userUseDefaultLocation && initialData.userDefaultLocationId) {
      setSelectedLocationId(initialData.userDefaultLocationId)
    }
  }, [initialData])

  const loadDashboard = useCallback(async () => {
    const res = await getChannelRoomDashboardAction({
      date: today,
      locationId: selectedLocationId,
    })
    if (res.success && res.data) {
      setRows(res.data)
      if (res.socketScopes) setSocketScopes(res.socketScopes)
    } else {
      setRows([])
    }
  }, [today, selectedLocationId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getChannelBookingInitialData()])
      .then(([init]) => {
        if (cancelled) return
        if (init.success && init.data) {
          setInitialData(init.data)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const subscribeLocs = useMemo(() => {
    const fromDash = socketScopes?.locationIds ?? []
    const fromBranches = filteredLocations.map((b) => b.id)
    return [...new Set([...fromDash, ...fromBranches])]
  }, [socketScopes, filteredLocations])

  const subscribeInsts = useMemo(() => {
    const fromDash = socketScopes?.institutionIds ?? []
    return [...new Set(fromDash)]
  }, [socketScopes])

  useChannelRoomSocket({
    locationIds: subscribeLocs,
    institutionIds: subscribeInsts,
    enabled: subscribeLocs.length > 0 || subscribeInsts.length > 0,
    onEvent: () => {
      void loadDashboard()
    },
  })

  useEffect(() => {
    if (!pickerDoctorId) {
      setPickerSessions([])
      setPickerSessionId("")
      return
    }
    let cancelled = false
    setPickerSessionsLoading(true)
    getChannelRoomDoctorSessionsAction(pickerDoctorId, today, selectedLocationId)
      .then((res) => {
        if (cancelled) return
        setPickerSessions(res.success && res.data ? res.data : [])
        setPickerSessionId("")
      })
      .finally(() => {
        if (!cancelled) setPickerSessionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [pickerDoctorId, today, selectedLocationId])

  const doctors = initialData?.doctors ?? []
  const canReleaseRoom = has("rooms", "edit")

  const openReleaseConfirm = (roomId: string, roomNumber: string | null) => {
    setReleaseTarget({ roomId, roomNumber })
    setReleaseAgree(false)
    setReleaseConfirmOpen(true)
  }

  const handleReleaseRoom = async (roomId: string) => {
    try {
      setReleasingRoomId(roomId)
      const res = await forceReleaseRoom(roomId)
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to release room.")
      }
      toast({
        variant: "success",
        title: "Room released",
        description: "Room occupancy lock has been released.",
      })
      await loadDashboard()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Release failed",
        description: error instanceof Error ? error.message : "Failed to release room.",
      })
    } finally {
      setReleasingRoomId(null)
      setReleaseConfirmOpen(false)
      setReleaseTarget(null)
      setReleaseAgree(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Dialog open={releaseConfirmOpen} onOpenChange={setReleaseConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release room lock?</DialogTitle>
            <DialogDescription>
              This will release Room {releaseTarget?.roomNumber ?? "—"} immediately and make it available for new arrivals.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2 rounded border p-3 text-sm">
            <Checkbox
              checked={releaseAgree}
              onCheckedChange={(checked) => setReleaseAgree(checked === true)}
            />
            <span>I agree I am releasing the room before doctor has left.</span>
          </label>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setReleaseConfirmOpen(false)} disabled={Boolean(releasingRoomId)}>
              Cancel
            </Button>
            <Button
              onClick={() => releaseTarget && void handleReleaseRoom(releaseTarget.roomId)}
              disabled={!releaseAgree || Boolean(releasingRoomId)}
            >
              {releasingRoomId ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Releasing
                </>
              ) : (
                "Release Room"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Channel Room Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            <span className="inline-flex rounded-md bg-primary/10 text-primary px-2.5 py-0.5 font-semibold mr-2">
              Today: {formatSessionDateShort(today)}
            </span>
            Active occupied rooms. Current patient number updates live when attendance is marked.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:mt-0">
          <BranchSelection
            options={branchOptions}
            value={selectedLocationId ?? "__all__"}
            onChange={(id) => setSelectedLocationId(id === "__all__" ? null : id)}
            placeholder="All branches"
            disabled={loading}
            className="w-[220px] h-9 text-sm"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => void loadDashboard()}>
            Refresh
          </Button>
          <Dialog open={visitRoomDialogOpen} onOpenChange={setVisitRoomDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="sm">
                Visit Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Open room by doctor</DialogTitle>
                <DialogDescription>
                  Select consultant and today&apos;s session, then open the room.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <DoctorDropdown doctors={doctors} value={pickerDoctorId} onChange={setPickerDoctorId} />
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Today&apos;s session</span>
                  <Select
                    value={pickerSessionId}
                    onValueChange={setPickerSessionId}
                    disabled={!pickerDoctorId || pickerSessionsLoading}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={pickerSessionsLoading ? "Loading…" : "Select session"} />
                    </SelectTrigger>
                    <SelectContent>
                      {pickerSessions.map((s) => (
                        <SelectItem key={s.id} value={s.id} disabled={!s.isDoctorArrived}>
                          {`${formatSessionStartTimeDisplay(s.startTime, today)} – Room ${s.roomNumber ?? "—"}${
                            s.isDoctorArrived ? "" : " (awaiting arrival)"
                          }`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {pickerSessionId && pickerSessions.find((s) => s.id === pickerSessionId)?.isDoctorArrived ? (
                  <Button asChild size="sm" className="h-9">
                    <Link href={`/channel-room-dashboard/${pickerSessionId}`}>Visit Room</Link>
                  </Button>
                ) : (
                  <Button size="sm" className="h-9" disabled>
                    Visit Room
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active rooms</CardTitle>
          <CardDescription>Rooms currently occupied today.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active channel rooms for this filter.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-center font-bold">Current #</TableHead>
                    <TableHead className="text-center">Shown</TableHead>
                    <TableHead className="text-center">No-show</TableHead>
                    <TableHead className="text-center">Waiting</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.sessionId}>
                      <TableCell className="font-medium">{r.roomNumber ?? "—"}</TableCell>
                      <TableCell>{r.doctorName}</TableCell>
                      <TableCell>{r.locationName ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatSessionStartTimeDisplay(r.startTime, today)} – {formatSessionStartTimeDisplay(r.endTime, today)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {r.channelCurrentPatientNumber === 0 ? "—" : r.channelCurrentPatientNumber}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{r.shownCount}</TableCell>
                      <TableCell className="text-center tabular-nums">{r.noShowCount}</TableCell>
                      <TableCell className="text-center tabular-nums">{r.waitingCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {canReleaseRoom && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReleaseConfirm(r.roomId, r.roomNumber)}
                              disabled={releasingRoomId === r.roomId}
                            >
                              Release Room
                            </Button>
                          )}
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/channel-room-dashboard/${r.sessionId}`}>Open room</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
