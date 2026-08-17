"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import {
  getCurrentShiftAction,
  pauseShiftAction,
  resumeShiftAction,
  cancelHandoverAction,
  canEndShiftWithoutHandoverAction,
  endShiftAction,
} from "@/app/actions/shift.actions"
import { getMyFloatBalanceAction, getMyPendingFloatRequestAction, getMyApprovedFloatRequestAction, cancelFloatRequestAction, receiveFloatRequestAction, declineApprovedFloatRequestAction } from "@/app/actions/float-request.actions"
import { FLOAT_REQUEST_STATUS } from "@/types/float-request"
import { formatCents, formatLKR } from "@/lib/format-money"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SHIFT_STATUS } from "@/types/shift"
import type { FloatRequest } from "@/types/float-request"
import { useToast } from "@/components/hooks/use-toast"
import { usePermissions } from "@/components/hooks/use-permissions"
import { CircleDot, Pause, Play, Square, ChevronDown, Loader2, PlayCircle, Banknote, Ban, CheckCircle, RefreshCw, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { RequestFloatDialog } from "./request-float-dialog"
import { EndShiftHandoverDialog } from "./end-shift-handover-dialog"
import { formatDenomLabel } from "@/types/float-request"

const HANDOVER_METHOD_LABELS: Record<string, string> = {
  cashCents: "Cash",
  cardCents: "Card",
  slipCents: "Slips",
  checkCents: "Cheques",
  creditCents: "Credit",
  eWalletCents: "E-Wallet",
}

type ShiftRecord = {
  id: string
  userId: string
  startedAt: Date | string
  endsAt: Date | string
  status: number
  pausedAt?: Date | string | null
  location?: { id: string; name: string; code?: string | null } | null
  handovers?: {
    id: string
    cashCents: number
    cardCents: number
    slipCents: number
    checkCents: number
    creditCents: number
    eWalletCents: number
    totalCents: number
    discrepancyReason: string | null
    toUser: { id: string; name: string | null }
  }[]
}

function formatShiftDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

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
  const { has: hasPermission } = usePermissions()
  const hasShiftPermission = hasPermission("shift", "view")
  const hasFloatRequestPermission = hasPermission("bulk-cashier", "float-request")
  const [shift, setShift] = useState<ShiftRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [floatBalanceCents, setFloatBalanceCents] = useState<number | null>(null)
  const [pendingFloatRequest, setPendingFloatRequest] = useState<FloatRequest | null>(null)
  const [approvedFloatRequest, setApprovedFloatRequest] = useState<FloatRequest | null>(null)
  const [requestFloatOpen, setRequestFloatOpen] = useState(false)
  const [receiveFloatOpen, setReceiveFloatOpen] = useState(false)
  const [requestFloatShiftIdOverride, setRequestFloatShiftIdOverride] = useState<string | null>(null)
  const [cancelFloatOpen, setCancelFloatOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelLoading, setCancelLoading] = useState(false)
  const [floatBalanceRefreshing, setFloatBalanceRefreshing] = useState(false)
  const [endShiftHandoverOpen, setEndShiftHandoverOpen] = useState(false)
  const [shiftDetailsOpen, setShiftDetailsOpen] = useState(false)
  const handoverDialogShiftRef = useRef<{ shiftId: string; fromUserId: string } | null>(null)
  const forcedHandoverPromptedForShiftIdRef = useRef<string | null>(null)
  const hadPendingFloatRef = useRef(false)
  const floatRequestSocketUserIdRef = useRef<string | null>(null)
  const floatBalanceUserIdRef = useRef<string | null>(null)
  const shiftSocketUserIdRef = useRef<string | null>(null)
  const { toast } = useToast()

  const refreshFloatBalance = useCallback(() => {
    setFloatBalanceRefreshing(true)
    getMyFloatBalanceAction()
      .then((res) => {
        if (res.success && res.balanceCents !== undefined) setFloatBalanceCents(res.balanceCents)
      })
      .finally(() => setFloatBalanceRefreshing(false))
  }, [])

  const refreshPendingFloatRequest = useCallback(() => {
    getMyPendingFloatRequestAction().then((res) => {
      if (res.success && res.data) setPendingFloatRequest(res.data)
      else setPendingFloatRequest(null)
    })
  }, [])

  const refreshApprovedFloatRequest = useCallback(() => {
    getMyApprovedFloatRequestAction().then((res) => {
      if (res.success && res.data) setApprovedFloatRequest(res.data)
      else setApprovedFloatRequest(null)
    })
  }, [])

  async function handleCancelFloatRequest() {
    if (!pendingFloatRequest || !cancelReason.trim()) return
    setCancelLoading(true)
    try {
      const res = await cancelFloatRequestAction({
        floatRequestId: pendingFloatRequest.id,
        reason: cancelReason.trim(),
      })
      if (res.success) {
        setCancelFloatOpen(false)
        setCancelReason("")
        refreshPendingFloatRequest()
        toast({ title: res.message ?? "Float request cancelled" })
      } else {
        toast({ title: "Error", description: res.error ?? "Failed to cancel", variant: "destructive" })
      }
    } finally {
      setCancelLoading(false)
    }
  }

  // Live clock while an open shift exists (also detects max-duration expiry)
  useEffect(() => {
    if (!shift || shift.status === SHIFT_STATUS.HANDOVER_PENDING) return
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [shift?.id, shift?.status])

  const refresh = useCallback(() => {
    if (!hasShiftPermission) return
    setLoading(true)
    getCurrentShiftAction()
      .then((s: ShiftRecord | null) => setShift(s))
      .catch((err: unknown) => {
        setShift(null)
        const message = err instanceof Error ? err.message : "You don’t have permission to use shift features."
        toast({
          title: "Access denied",
          description: message,
          variant: "destructive",
        })
      })
      .finally(() => setLoading(false))
  }, [hasShiftPermission, toast])

  useEffect(() => {
    refresh()
  }, [hasShiftPermission, refresh])

  useEffect(() => {
    if (!hasShiftPermission) return
    const onShiftStarted = () => {
      refresh()
      if (hasFloatRequestPermission) {
        refreshFloatBalance()
        refreshPendingFloatRequest()
        refreshApprovedFloatRequest()
      }
    }
    window.addEventListener("channel-booking:shift-started", onShiftStarted)
    return () => window.removeEventListener("channel-booking:shift-started", onShiftStarted)
  }, [hasShiftPermission, hasFloatRequestPermission, refreshFloatBalance, refreshPendingFloatRequest])

  useEffect(() => {
    if (shift && hasFloatRequestPermission) {
      refreshFloatBalance()
      refreshPendingFloatRequest()
      refreshApprovedFloatRequest()
    } else {
      if (!hasFloatRequestPermission) setFloatBalanceCents(null)
      setPendingFloatRequest(null)
      setApprovedFloatRequest(null)
    }
  }, [shift?.id, hasFloatRequestPermission, refreshFloatBalance, refreshPendingFloatRequest, refreshApprovedFloatRequest])

  // Socket: when user has a shift, subscribe to shift-update (so other tabs refresh on handover/pause/resume); optionally float-balance and float-request
  const socketRef = useRef<Socket | null>(null)
  useEffect(() => {
    if (typeof window === "undefined" || !shift) {
      if (socketRef.current) {
        const uid = shiftSocketUserIdRef.current
        if (uid) {
          socketRef.current.emit("shift:unsubscribe", { userId: uid })
          shiftSocketUserIdRef.current = null
        }
        if (floatBalanceUserIdRef.current) {
          socketRef.current.emit("float-balance:unsubscribe", { userId: floatBalanceUserIdRef.current })
          floatBalanceUserIdRef.current = null
        }
        if (floatRequestSocketUserIdRef.current) {
          socketRef.current.emit("float-request:unsubscribe", { userId: floatRequestSocketUserIdRef.current })
          floatRequestSocketUserIdRef.current = null
        }
        socketRef.current.disconnect()
        socketRef.current = null
      }
      hadPendingFloatRef.current = false
      return
    }
    if (pendingFloatRequest) hadPendingFloatRef.current = true
    const userId = shift.userId
    floatBalanceUserIdRef.current = userId
    const requestId = pendingFloatRequest?.id ?? null
    const socket = io(window.location.origin, { path: "/socket.io", addTrailingSlash: false })
    socketRef.current = socket

    const doSubscribe = () => {
      shiftSocketUserIdRef.current = userId
      socket.emit("shift:subscribe", { userId })
      if (hasFloatRequestPermission) {
        socket.emit("float-balance:subscribe", { userId })
        if (pendingFloatRequest) {
          floatRequestSocketUserIdRef.current = userId
          socket.emit("float-request:subscribe", { userId })
        }
      }
    }
    if (socket.connected) doSubscribe()
    else socket.once("connect", doSubscribe)

    const onShiftUpdate = () => {
      refresh()
    }
    socket.on("shift-update", onShiftUpdate)

    const onFloatBalanceUpdate = () => {
      refreshFloatBalance()
    }
    socket.on("float-balance-update", onFloatBalanceUpdate)

    const onFloatRequestUpdate = (data: { floatRequestId: string; status: number }) => {
      if (requestId && data?.floatRequestId !== requestId) return
      if (data.status === FLOAT_REQUEST_STATUS.APPROVED) {
        Promise.all([getMyPendingFloatRequestAction(), getMyApprovedFloatRequestAction()]).then(
          ([pendingRes, approvedRes]) => {
            setPendingFloatRequest(pendingRes.success ? pendingRes.data ?? null : null)
            const approved = approvedRes.success ? approvedRes.data : null
            setApprovedFloatRequest(approved ?? null)
            if (approved) {
              hadPendingFloatRef.current = false
              setReceiveFloatOpen(true)
              toast({ title: "Your float request was approved. Enter the code to receive it." })
            }
          }
        )
      } else if (data.status === FLOAT_REQUEST_STATUS.REJECTED) {
        refreshPendingFloatRequest()
        setApprovedFloatRequest(null)
        hadPendingFloatRef.current = false
        toast({ title: "Your float request was rejected.", variant: "destructive" })
      }
    }
    socket.on("float-request-update", onFloatRequestUpdate)

    return () => {
      socket.emit("shift:unsubscribe", { userId })
      shiftSocketUserIdRef.current = null
      if (floatBalanceUserIdRef.current) {
        socket.emit("float-balance:unsubscribe", { userId })
        floatBalanceUserIdRef.current = null
      }
      if (floatRequestSocketUserIdRef.current) {
        socket.emit("float-request:unsubscribe", { userId: floatRequestSocketUserIdRef.current })
        floatRequestSocketUserIdRef.current = null
      }
      socket.off("shift-update", onShiftUpdate)
      socket.off("float-balance-update", onFloatBalanceUpdate)
      socket.off("float-request-update", onFloatRequestUpdate)
      socket.disconnect()
      socketRef.current = null
    }
  }, [shift?.id, shift?.userId, hasFloatRequestPermission, pendingFloatRequest?.id, pendingFloatRequest?.requestedById, refresh, refreshFloatBalance, refreshPendingFloatRequest, toast])

  // Fallback polling when socket is not used (e.g. next:dev without custom server) or as backup
  useEffect(() => {
    if (!shift || !hasFloatRequestPermission || !pendingFloatRequest) {
      if (!pendingFloatRequest) hadPendingFloatRef.current = false
      return
    }
    hadPendingFloatRef.current = true
    const POLL_MS = 8000
    const interval = setInterval(() => {
      Promise.all([
        getMyPendingFloatRequestAction(),
        getMyApprovedFloatRequestAction(),
      ]).then(([pendingRes, approvedRes]) => {
        const pending = pendingRes.success ? pendingRes.data : null
        const approved = approvedRes.success ? approvedRes.data : null
        setPendingFloatRequest(pending ?? null)
        setApprovedFloatRequest(approved ?? null)
        if (hadPendingFloatRef.current && !pending && approved) {
          hadPendingFloatRef.current = false
          setReceiveFloatOpen(true)
          toast({ title: "Your float request was approved. Enter the code to receive it." })
        }
      })
    }, POLL_MS)
    return () => clearInterval(interval)
  }, [shift?.id, hasFloatRequestPermission, pendingFloatRequest?.id, toast])

  useEffect(() => {
    if (!hasFloatRequestPermission) return
    const openRequestFloat = (e: Event) => {
      const shiftId = (e as CustomEvent<{ shiftId?: string | null }>)?.detail?.shiftId ?? null
      setRequestFloatShiftIdOverride(shiftId ?? null)
      setRequestFloatOpen(true)
    }
    window.addEventListener("channel-booking:open-request-float-dialog", openRequestFloat)
    return () => window.removeEventListener("channel-booking:open-request-float-dialog", openRequestFloat)
  }, [hasFloatRequestPermission])

  // When max duration is exceeded: end immediately if till is empty; otherwise force handover
  useEffect(() => {
    if (!shift) {
      forcedHandoverPromptedForShiftIdRef.current = null
      return
    }
    if (shift.status === SHIFT_STATUS.HANDOVER_PENDING) return
    const endsAt = typeof shift.endsAt === "string" ? new Date(shift.endsAt) : shift.endsAt
    if (endsAt.getTime() > now.getTime()) return
    if (forcedHandoverPromptedForShiftIdRef.current === shift.id) return
    forcedHandoverPromptedForShiftIdRef.current = shift.id

    let cancelled = false
    ;(async () => {
      try {
        const check = await canEndShiftWithoutHandoverAction()
        if (cancelled) return
        if (check.allowed) {
          try {
            await endShiftAction(shift.id)
          } catch {
            // Already ended (e.g. user clicked End at the same time) — do not open handover.
          }
          if (cancelled) return
          refresh()
          toast({
            title: "Shift ended",
            description: "Time limit reached with no till balance — closed without a handover.",
          })
          return
        }
      } catch {
        // Could not determine empty-close eligibility; still prompt handover below.
      }
      if (cancelled) return
      handoverDialogShiftRef.current = { shiftId: shift.id, fromUserId: shift.userId }
      setEndShiftHandoverOpen(true)
      toast({
        title: "Shift time limit ended",
        description: "Complete handover to close this shift before starting a new one.",
        variant: "destructive",
      })
    })()

    return () => {
      cancelled = true
    }
  }, [shift?.id, shift?.userId, shift?.status, shift?.endsAt, now, toast, refresh])

  if (!hasShiftPermission) return null
  if (loading) return null

  const SHOW_START_SHIFT_DIALOG_EVENT = "channel-booking:show-start-shift-dialog"

  if (!shift) {
    return (
      <>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground gap-2 rounded-md font-medium"
          onClick={() => window.dispatchEvent(new CustomEvent(SHOW_START_SHIFT_DIALOG_EVENT))}
        >
          <PlayCircle className="h-4 w-4 shrink-0" />
          Start a shift
        </Button>
        {hasFloatRequestPermission && (
          <RequestFloatDialog
            open={requestFloatOpen}
            onOpenChange={(open) => {
              setRequestFloatOpen(open)
              if (!open) setRequestFloatShiftIdOverride(null)
            }}
            shiftId={requestFloatShiftIdOverride}
            onSuccess={refreshFloatBalance}
          />
        )}
      </>
    )
  }

  const isActive = shift.status === SHIFT_STATUS.ACTIVE
  const isPaused = shift.status === SHIFT_STATUS.PAUSED
  const isHandoverPending = shift.status === SHIFT_STATUS.HANDOVER_PENDING
  const endsAtDate = typeof shift.endsAt === "string" ? new Date(shift.endsAt) : shift.endsAt
  const isExpired = endsAtDate.getTime() <= now.getTime()
  const pendingHandover = shift.handovers?.[0]
  const asOf = isPaused && shift.pausedAt
    ? typeof shift.pausedAt === "string"
      ? new Date(shift.pausedAt)
      : shift.pausedAt
    : now
  const elapsed = formatElapsed(shift.startedAt, asOf)

  async function openEndShiftHandover() {
    if (!shift) return
    setActionLoading("end-shift")
    try {
      const check = await canEndShiftWithoutHandoverAction()
      if (check.allowed) {
        await endShiftAction(shift.id)
        refresh()
        toast({ title: "Shift ended", description: "No till balance — closed without a handover." })
        return
      }
      handoverDialogShiftRef.current = { shiftId: shift.id, fromUserId: shift.userId }
      setEndShiftHandoverOpen(true)
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to end shift",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

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

  async function handleCancelHandover() {
    if (!pendingHandover) return
    setActionLoading("cancel-handover")
    try {
      await cancelHandoverAction(pendingHandover.id)
      refresh()
      toast({ title: "Handover cancelled. Shift is active again." })
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to cancel handover", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              disabled={!!actionLoading}
              className={cn(
                "gap-2 rounded-md font-medium",
                isExpired && !isHandoverPending && "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground",
                !isExpired && isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                !isExpired && isPaused && "bg-amber-600 text-white hover:bg-amber-700 hover:text-white",
                isHandoverPending && "bg-amber-600 text-white hover:bg-amber-700 hover:text-white"
              )}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <CircleDot className="h-4 w-4 shrink-0" />
              )}
              <span className="flex items-center gap-1.5">
                {isHandoverPending
                  ? "Handover pending"
                  : isExpired
                    ? "Shift expired — handover required"
                    : isActive
                      ? "Shift active"
                      : "Shift paused"}
                {!isHandoverPending && !isExpired && (
                  <span className="opacity-90 tabular-nums">
                    {elapsed}
                  </span>
                )}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-90" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isHandoverPending && pendingHandover && (
              <>
                {pendingHandover.toUser?.name && (
                  <DropdownMenuLabel className="font-normal text-muted-foreground">
                    Waiting for {pendingHandover.toUser.name} to approve
                  </DropdownMenuLabel>
                )}
                <div className="px-2 py-1.5 text-sm space-y-1 border-b border-border">
                  {shift && (
                    <p className="text-muted-foreground text-xs">
                      Started: {(typeof shift.startedAt === "string" ? new Date(shift.startedAt) : shift.startedAt).toLocaleString()}
                      {" · "}
                      Ends: {(typeof shift.endsAt === "string" ? new Date(shift.endsAt) : shift.endsAt).toLocaleString()}
                    </p>
                  )}
                  <p className="font-medium tabular-nums">Total: LKR {formatCents(pendingHandover.totalCents ?? 0)}</p>
                  {(["cashCents", "cardCents", "slipCents", "checkCents", "creditCents", "eWalletCents"] as const).map(
                    (key) => {
                      const cents = pendingHandover[key] ?? 0
                      if (cents === 0) return null
                      return (
                        <p key={key} className="text-muted-foreground tabular-nums text-xs">
                          {HANDOVER_METHOD_LABELS[key]}: {formatCents(cents)}
                        </p>
                      )
                    }
                  )}
                  {pendingHandover.discrepancyReason && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Discrepancy: {pendingHandover.discrepancyReason}
                    </p>
                  )}
                </div>
                <DropdownMenuItem
                  onClick={handleCancelHandover}
                  disabled={!!actionLoading}
                  className="text-destructive focus:bg-destructive focus:text-destructive-foreground data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Cancel handover
                </DropdownMenuItem>
              </>
            )}
            {isActive && !isHandoverPending && !isExpired && (
              <DropdownMenuItem onClick={handlePause} disabled={!!actionLoading}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </DropdownMenuItem>
            )}
            {isPaused && !isExpired && (
              <DropdownMenuItem onClick={handleResume} disabled={!!actionLoading}>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </DropdownMenuItem>
            )}
            {isExpired && !isHandoverPending && (
              <DropdownMenuLabel className="font-normal text-muted-foreground text-xs max-w-64 whitespace-normal">
                Time limit ended. End the shift (empty till) or complete a handover if you have a balance.
              </DropdownMenuLabel>
            )}
            <DropdownMenuItem onSelect={() => setShiftDetailsOpen(true)}>
              <Info className="h-4 w-4 mr-2" />
              View shift details
            </DropdownMenuItem>
            {(isActive || (isPaused && isExpired)) && !isHandoverPending && (
              <DropdownMenuItem
                onClick={openEndShiftHandover}
                disabled={!!actionLoading}
                className="text-destructive focus:bg-destructive focus:text-destructive-foreground data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground"
              >
                <Square className="h-4 w-4 mr-2" />
                {isExpired ? "End / complete handover" : "End shift"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>        </DropdownMenu>
        {hasFloatRequestPermission && (
          <>
            {pendingFloatRequest ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 rounded-md font-medium text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-background hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/30 dark:hover:text-amber-300 focus-visible:ring-amber-500/50 focus-visible:ring-offset-background"
                  >
                    <Banknote className="h-4 w-4 shrink-0" />
                    Float request is pending
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-90" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel>Float request is pending</DropdownMenuLabel>
                  <div className="px-2 py-1.5 text-sm text-muted-foreground space-y-0.5">
                    <p className="tabular-nums">
                      Amount: LKR {formatCents(pendingFloatRequest.amountRequested)}
                    </p>
                    {pendingFloatRequest.bulkCashier?.name && (
                      <p>Bulk cashier: {pendingFloatRequest.bulkCashier.name}</p>
                    )}
                    <p>
                      Requested:{" "}
                      {typeof pendingFloatRequest.createdAt === "string"
                        ? new Date(pendingFloatRequest.createdAt).toLocaleString()
                        : pendingFloatRequest.createdAt.toLocaleString()}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setCancelFloatOpen(true)}
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Cancel request
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : approvedFloatRequest ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 rounded-md font-medium text-green-600 dark:text-green-400 border-green-200 dark:border-green-800"
                onClick={() => setReceiveFloatOpen(true)}
              >
                <CheckCircle className="h-4 w-4 shrink-0" />
                Receive float
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 rounded-md font-medium"
                onClick={() => {
                  setRequestFloatShiftIdOverride(null)
                  setRequestFloatOpen(true)
                }}
              >
                <Banknote className="h-4 w-4 shrink-0" />
                Request float
              </Button>
            )}
            {floatBalanceCents !== null && (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                Float: LKR {formatCents(floatBalanceCents)}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={refreshFloatBalance}
                  disabled={floatBalanceRefreshing}
                  title="Refresh balance"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", floatBalanceRefreshing && "animate-spin")} />
                </Button>
              </span>
            )}
          </>
        )}
      </div>
      {hasFloatRequestPermission && (
        <RequestFloatDialog
          open={requestFloatOpen}
          onOpenChange={(open) => {
            setRequestFloatOpen(open)
            if (!open) setRequestFloatShiftIdOverride(null)
          }}
          shiftId={requestFloatShiftIdOverride ?? shift?.id ?? null}
          onSuccess={() => {
            refreshFloatBalance()
            refreshPendingFloatRequest()
          }}
        />
      )}
      {approvedFloatRequest && (
        <Dialog open={receiveFloatOpen} onOpenChange={setReceiveFloatOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Receive float</DialogTitle>
              <DialogDescription>
                Enter the 4-digit code from your handover slip to confirm receipt. Your float balance will be updated.
              </DialogDescription>
            </DialogHeader>
            <ReceiveFloatForm
              request={approvedFloatRequest}
              onSuccess={() => {
                setReceiveFloatOpen(false)
                refreshFloatBalance()
                refreshApprovedFloatRequest()
                toast({ title: "Float received. Your balance has been updated." })
              }}
              onDecline={() => {
                setReceiveFloatOpen(false)
                refreshApprovedFloatRequest()
                toast({ title: "Float request declined. No balance change." })
              }}
              onError={(msg) => toast({ title: "Error", description: msg, variant: "destructive" })}
            />
          </DialogContent>
        </Dialog>
      )}
      <Dialog open={cancelFloatOpen} onOpenChange={setCancelFloatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel float request</DialogTitle>
            <DialogDescription>
              Provide a reason for cancelling this request. Only pending requests can be cancelled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Cancel reason (required)</Label>
            <Textarea
              id="cancel-reason"
              placeholder="e.g. No longer needed"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelFloatOpen(false)} disabled={cancelLoading}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelFloatRequest}
              disabled={!cancelReason.trim() || cancelLoading}
            >
              {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cancel request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={shiftDetailsOpen} onOpenChange={setShiftDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Shift details</DialogTitle>
            <DialogDescription>Basic details for your current shift.</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">
              {isHandoverPending
                ? "Handover pending"
                : isExpired
                  ? "Expired — handover required"
                  : isPaused
                    ? "Paused"
                    : "Active"}
            </dd>
            <dt className="text-muted-foreground">Location</dt>
            <dd>
              {shift.location?.name
                ? shift.location.code
                  ? `${shift.location.name} (${shift.location.code})`
                  : shift.location.name
                : "—"}
            </dd>
            <dt className="text-muted-foreground">Started</dt>
            <dd>{formatShiftDateTime(shift.startedAt)}</dd>
            <dt className="text-muted-foreground">Time limit ends</dt>
            <dd>{formatShiftDateTime(shift.endsAt)}</dd>
            {shift.pausedAt ? (
              <>
                <dt className="text-muted-foreground">Paused at</dt>
                <dd>{formatShiftDateTime(shift.pausedAt)}</dd>
              </>
            ) : null}
            <dt className="text-muted-foreground">{isExpired ? "Elapsed" : "Running"}</dt>
            <dd className="tabular-nums">{elapsed}</dd>
            {isHandoverPending && pendingHandover?.toUser?.name ? (
              <>
                <dt className="text-muted-foreground">Handing over to</dt>
                <dd>{pendingHandover.toUser.name}</dd>
              </>
            ) : null}
          </dl>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShiftDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {endShiftHandoverOpen && (shift?.id ?? handoverDialogShiftRef.current?.shiftId) && (shift?.userId ?? handoverDialogShiftRef.current?.fromUserId) ? (
        <EndShiftHandoverDialog
          open={endShiftHandoverOpen}
          onOpenChange={(open) => {
            if (!open) handoverDialogShiftRef.current = null
            setEndShiftHandoverOpen(open)
          }}
          shiftId={shift?.id ?? handoverDialogShiftRef.current?.shiftId ?? ""}
          fromUserId={shift?.userId ?? handoverDialogShiftRef.current?.fromUserId ?? ""}
          onSuccess={() => {
            handoverDialogShiftRef.current = null
            refresh()
            if (hasFloatRequestPermission) {
              refreshFloatBalance()
              refreshPendingFloatRequest()
              refreshApprovedFloatRequest()
            }
          }}
        />
      ) : null}
    </>
  )
}

function ReceiveFloatForm({
  request,
  onSuccess,
  onDecline,
  onError,
}: {
  request: FloatRequest
  onSuccess: () => void
  onDecline: () => void
  onError: (msg: string) => void
}) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectLoading, setRejectLoading] = useState(false)
  const denoms = (request.denominationsApproved ?? []).filter((d) => d.count > 0)
  const totalLKR = denoms.reduce((s, d) => s + d.value * d.count, 0)

  async function handleSubmit() {
    const trimmed = code.trim()
    if (!trimmed) {
      onError("Enter the 4-digit code from your slip.")
      return
    }
    setLoading(true)
    try {
      const res = await receiveFloatRequestAction({
        floatRequestId: request.id,
        receiveCode: trimmed,
      })
      if (res.success) onSuccess()
      else onError(res.error ?? "Failed to receive float")
    } finally {
      setLoading(false)
    }
  }

  async function handleDecline() {
    const reason = rejectReason.trim()
    if (!reason) {
      onError("Please provide a reason for rejecting the float.")
      return
    }
    setRejectLoading(true)
    try {
      const res = await declineApprovedFloatRequestAction({
        floatRequestId: request.id,
        reason,
      })
      if (res.success) onDecline()
      else onError(res.error ?? "Failed to decline")
    } finally {
      setRejectLoading(false)
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-md border bg-muted/40 p-3 text-sm">
        <p className="font-medium tabular-nums">Amount: LKR {formatLKR(totalLKR)}</p>
        {denoms.length > 0 && (
          <p className="text-muted-foreground mt-1">
            {denoms.map((d) => `${formatDenomLabel(d.value)}×${d.count}`).join(", ")}
          </p>
        )}
      </div>
      {!rejectMode ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="receive-code">4-digit code</Label>
            <Input
              id="receive-code"
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder="e.g. 1234"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="font-mono text-lg tracking-widest"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              className="mr-auto text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-7 px-2"
              onClick={() => setRejectMode(true)}
              disabled={loading || rejectLoading}
            >
              Reject (cancel float)
            </Button>
            <Button onClick={handleSubmit} disabled={!code.trim() || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Confirm receipt
            </Button>
          </DialogFooter>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason for rejecting (required)</Label>
            <Textarea
              id="reject-reason"
              placeholder="e.g. Wrong amount prepared, will request again"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setRejectMode(false); setRejectReason(""); }} disabled={rejectLoading}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={!rejectReason.trim() || rejectLoading}
            >
              {rejectLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
              Confirm reject
            </Button>
          </DialogFooter>
        </>
      )}
    </div>
  )
}
