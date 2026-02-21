"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Activity, Cpu, HardDrive, Clock, Wifi, WifiOff, CircleHelp } from "lucide-react"

const POLL_INTERVAL_MS = 5000

type Status = "ok" | "warning" | "danger"

type MonitorData = {
  socket: {
    connections: number
    status: Status
    socketAvailable: boolean
  }
  memory: {
    rssMb: number
    heapUsedMb: number
    heapTotalMb: number
    rssStatus: Status
    heapStatus: Status
  }
  uptimeSeconds: number
  at: string
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(" ")
}

function statusBorder(status: Status): string {
  switch (status) {
    case "danger":
      return "border-red-500 dark:border-red-600 bg-red-500/5 dark:bg-red-600/5"
    case "warning":
      return "border-amber-500 dark:border-amber-600 bg-amber-500/5 dark:bg-amber-600/5"
    default:
      return "border-border"
  }
}

function statusText(status: Status): string {
  switch (status) {
    case "danger":
      return "text-red-600 dark:text-red-400"
    case "warning":
      return "text-amber-600 dark:text-amber-400"
    default:
      return "text-muted-foreground"
  }
}

function StatusBadge({ status }: { status: Status }) {
  const label = status === "ok" ? "OK" : status === "warning" ? "Warning" : "Danger"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        status === "danger" && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        status === "warning" && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        status === "ok" && "bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  )
}

function MetricTitleWithHelp({
  title,
  explanation,
}: {
  title: string
  explanation: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full p-0.5"
            aria-label={`Explain: ${title}`}
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={6}
          align="start"
          collisionPadding={12}
          className="z-[100] max-w-[260px] rounded-md border bg-popover px-3 py-2.5 text-sm text-popover-foreground shadow-md"
        >
          <p className="text-left leading-snug whitespace-normal">{explanation}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export function MonitorDashboard() {
  const [data, setData] = useState<MonitorData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/monitor", { cache: "no-store" })
      if (!res.ok) {
        if (res.status === 403) setError("You don't have permission to view this page.")
        else setError("Failed to load monitor data.")
        return
      }
      const json = await res.json()
      setData(json)
      setError(null)
    } catch {
      setError("Failed to load monitor data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const id = setInterval(fetchStats, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  if (loading && !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-5 w-24 rounded bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <p className="text-destructive font-medium">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const { socket, memory, uptimeSeconds, at } = data

  const socketExplanation =
    "Number of browser tabs or devices currently connected to this server for real-time updates (e.g. Channel Booking sessions list). Each open Channel Booking page with a doctor selected counts as one connection. High numbers may increase memory use."
  const rssExplanation =
    "Resident Set Size: how much physical RAM this Node.js process is using. Includes code, data, and heap. Grows as the app handles more requests and keeps more data in memory."
  const heapExplanation =
    "Memory used from Node’s JavaScript heap (where objects and variables live). Danger if most of the allocated heap is used—can mean high load or a possible leak. The server may slow or crash if the heap is exhausted."
  const uptimeExplanation =
    "How long this server process has been running since it was last started or restarted. Restarts reset this and clear in-memory state (e.g. Socket.io connections)."

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={0}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className={cn("transition-colors", statusBorder(socket.status))}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <MetricTitleWithHelp title="Socket connections" explanation={socketExplanation} />
              {socket.socketAvailable ? (
                <Wifi className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <span title="Custom server not in use">
                  <WifiOff className="h-4 w-4 text-amber-500 shrink-0" />
                </span>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{socket.connections}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Real-time channel-booking clients
              </p>
            <div className="mt-2">
              <StatusBadge status={socket.status} />
            </div>
          </CardContent>
        </Card>

        <Card className={cn("transition-colors", statusBorder(memory.rssStatus))}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <MetricTitleWithHelp title="Memory (RSS)" explanation={rssExplanation} />
            <HardDrive className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold tabular-nums", statusText(memory.rssStatus))}>
              {memory.rssMb} MB
            </div>
            <p className="text-xs text-muted-foreground mt-1">Process resident set size</p>
            <div className="mt-2">
              <StatusBadge status={memory.rssStatus} />
            </div>
          </CardContent>
        </Card>

        <Card className={cn("transition-colors", statusBorder(memory.heapStatus))}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <MetricTitleWithHelp title="Heap used" explanation={heapExplanation} />
            <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold tabular-nums", statusText(memory.heapStatus))}>
              {memory.heapUsedMb} MB
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of {memory.heapTotalMb} MB allocated
            </p>
            <div className="mt-2">
              <StatusBadge status={memory.heapStatus} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <MetricTitleWithHelp title="Uptime" explanation={uptimeExplanation} />
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums font-mono">
              {formatUptime(uptimeSeconds)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Process uptime</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Server monitor
          </CardTitle>
          <CardDescription>
            Data refreshes every {POLL_INTERVAL_MS / 1000} seconds. Red = danger, amber = warning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(at).toLocaleString()}
          </p>
        </CardContent>
      </Card>
      </div>
    </TooltipProvider>
  )
}
