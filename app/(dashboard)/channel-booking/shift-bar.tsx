"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import {
  getCurrentShiftAction,
  pauseShiftAction,
  resumeShiftAction,
  endShiftAction,
} from "@/app/actions/shift.actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SHIFT_STATUS } from "@/types/shift"
import { useToast } from "@/components/hooks/use-toast"
import { CircleDot, Pause, Play, Square, ChevronDown, Loader2, PlayCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type ShiftRecord = {
  id: string
  userId: string
  startedAt: Date | string
  endsAt: Date | string
  status: number
  pausedAt?: Date | string | null
}

const CHANNEL_BOOKING_PATH = "/channel-booking"

/** Format elapsed as stopwatch-style HH:MM:SS (e.g. 00:05:05). */
function formatElapsed(startedAt: Date | string, asOf: Date): string {
  const start = typeof startedAt === "string" ? new Date(startedAt) : startedAt
  const ms = Math.max(0, asOf.getTime() - start.getTime())
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export function ChannelBookingShiftBar() {
  const pathname = usePathname()
  const isChannelBooking = pathname?.startsWith(CHANNEL_BOOKING_PATH)
  const [shift, setShift] = useState<ShiftRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const { toast } = useToast()

  // Live-updating clock when shift is active (tick every second)
  useEffect(() => {
    if (!shift || shift.status !== SHIFT_STATUS.ACTIVE) return
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [shift?.id, shift?.status])

  const refresh = () => {
    if (!isChannelBooking) return
    setLoading(true)
    getCurrentShiftAction()
      .then((s: ShiftRecord | null) => setShift(s))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [isChannelBooking, pathname])

  useEffect(() => {
    if (!isChannelBooking) return
    const onShiftStarted = () => refresh()
    window.addEventListener("channel-booking:shift-started", onShiftStarted)
    return () => window.removeEventListener("channel-booking:shift-started", onShiftStarted)
  }, [isChannelBooking])

  if (!isChannelBooking) return null
  if (loading) return null

  const SHOW_START_SHIFT_DIALOG_EVENT = "channel-booking:show-start-shift-dialog"

  if (!shift) {
    return (
      <Button
        size="sm"
        className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground gap-2 rounded-md font-medium"
        onClick={() => window.dispatchEvent(new CustomEvent(SHOW_START_SHIFT_DIALOG_EVENT))}
      >
        <PlayCircle className="h-4 w-4 shrink-0" />
        Start a shift
      </Button>
    )
  }

  const isActive = shift.status === SHIFT_STATUS.ACTIVE
  const isPaused = shift.status === SHIFT_STATUS.PAUSED
  const asOf = isPaused && shift.pausedAt
    ? typeof shift.pausedAt === "string"
      ? new Date(shift.pausedAt)
      : shift.pausedAt
    : now
  const elapsed = formatElapsed(shift.startedAt, asOf)

  async function handlePause() {
    if (!shift) return
    setActionLoading("pause")
    try {
      await pauseShiftAction(shift.id)
      refresh()
      toast({ title: "Shift paused" })
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to pause", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleResume() {
    if (!shift) return
    setActionLoading("resume")
    try {
      await resumeShiftAction(shift.id)
      refresh()
      toast({ title: "Shift resumed" })
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to resume", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleEnd() {
    if (!shift) return
    setActionLoading("end")
    try {
      await endShiftAction(shift.id)
      refresh()
      toast({ title: "Shift ended" })
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to end shift", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          disabled={!!actionLoading}
          className={cn(
            "gap-2 rounded-md font-medium",
            isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
            isPaused && "bg-amber-600 text-white hover:bg-amber-700 hover:text-white"
          )}
        >
          {actionLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <CircleDot className="h-4 w-4 shrink-0" />
          )}
          <span className="flex items-center gap-1.5">
            {isActive ? "Shift active" : "Shift paused"}
            <span className="opacity-90 tabular-nums">
              {elapsed}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-90" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isActive && (
          <DropdownMenuItem onClick={handlePause} disabled={!!actionLoading}>
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </DropdownMenuItem>
        )}
        {isPaused && (
          <DropdownMenuItem onClick={handleResume} disabled={!!actionLoading}>
            <Play className="h-4 w-4 mr-2" />
            Resume
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={handleEnd}
          disabled={!!actionLoading}
          className="text-destructive focus:bg-destructive focus:text-destructive-foreground data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground"
        >
          <Square className="h-4 w-4 mr-2" />
          End shift
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
