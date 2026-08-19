"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { getHandoverDetailAction, approveHandoverAction, rejectHandoverAction } from "@/app/actions/shift.actions"
import {
  sendHandoverToReconciliationAction,
  changeReconciliationAssigneeAction,
  getReconcilerUserOptionsAction,
} from "@/app/actions/reconciliation.actions"
import { getCashierSummaryReportData } from "@/app/actions/reports/cashier-summary.action"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { SearchableUserSelect } from "@/components/common/user-select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/hooks/use-toast"
import { usePermissions } from "@/components/hooks/use-permissions"
import { formatCents, formatLKR } from "@/lib/format-money"
import {
  buildCashierSummaryReportUrl,
  deriveHandoverCashierSummaryFilters,
} from "@/lib/handover-utils"
import { formatDenomLabel, FLOAT_REQUEST_STATUS, floatRequestStatusLabel } from "@/types/float-request"
import type { CashierSummaryReportSection } from "@/types/report"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  ExternalLink,
  Banknote,
  CreditCard,
  FileText as SlipIcon,
  Receipt,
  Wallet,
  Smartphone,
  CircleAlert,
  GitBranch,
  Printer,
  ChevronDown,
} from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { HandoverCashInPrint } from "./handover-cash-in-print"
import { HandoverSummaryPrint } from "./handover-summary-print"
import { HANDOVER_STATUS, RECONCILIATION_STATUS } from "@/types/handover"
import { FileCheck } from "lucide-react"
import { cn } from "@/lib/utils"

const METHOD_KEYS = ["cashCents", "cardCents", "slipCents", "checkCents", "creditCents", "eWalletCents"] as const
const METHOD_LABELS: Record<(typeof METHOD_KEYS)[number], string> = {
  cashCents: "Cash",
  cardCents: "Card",
  slipCents: "Slips",
  checkCents: "Cheques",
  creditCents: "Credit",
  eWalletCents: "E-Wallet",
}
const METHOD_ICONS: Record<(typeof METHOD_KEYS)[number], typeof Banknote> = {
  cashCents: Banknote,
  cardCents: CreditCard,
  slipCents: SlipIcon,
  checkCents: Receipt,
  creditCents: Wallet,
  eWalletCents: Smartphone,
}

type HandoverDetail = NonNullable<Awaited<ReturnType<typeof getHandoverDetailAction>>["data"]>
type Handover = HandoverDetail["handover"]
type TillBreakdown = HandoverDetail["tillBreakdown"]

type EnteredBreakdown = {
  cashDenominations?: { value: number; count: number }[]
  cardEntries?: { reference: string; amountCents: number }[]
  slipEntries?: { reference: string; amountCents: number }[]
  checkEntries?: { reference: string; amountCents: number }[]
  creditEntries?: { reference: string; amountCents: number }[]
  eWalletEntries?: { reference: string; amountCents: number }[]
}

function fromUserLabel(
  fromUser:
    | { name: string | null; staff?: { code: string } | null }
    | null
    | undefined
): string {
  if (!fromUser) return "—"
  const name = fromUser.name ?? "—"
  return fromUser.staff?.code ? `${name} (${fromUser.staff.code})` : name
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`
}

function denomSummary(entries: { value: number; count: number }[] | null | undefined): string {
  if (!entries?.length) return "—"
  const parts = entries
    .filter((d) => d.count > 0)
    .map((d) => `${formatDenomLabel(d.value)}×${d.count}`)
  return parts.length > 0 ? parts.join(", ") : "—"
}

function parseEnteredBreakdown(raw: unknown): EnteredBreakdown | null {
  if (raw == null) return null
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as EnteredBreakdown
    } catch {
      return null
    }
  }
  return raw as EnteredBreakdown
}

function handoverBreakdownSummary(raw: unknown): string {
  const b = parseEnteredBreakdown(raw)
  if (!b) return "—"
  const parts: string[] = []
  const cash = (b.cashDenominations ?? []).filter((d) => d.count > 0)
  if (cash.length) parts.push(`Cash ${denomSummary(cash)}`)
  const entryGroups: { label: string; entries?: { reference: string; amountCents: number }[] }[] = [
    { label: "Card", entries: b.cardEntries },
    { label: "Slips", entries: b.slipEntries },
    { label: "Cheques", entries: b.checkEntries },
    { label: "Credit", entries: b.creditEntries },
    { label: "E-Wallet", entries: b.eWalletEntries },
  ]
  for (const g of entryGroups) {
    const entries = (g.entries ?? []).filter((e) => (e.amountCents ?? 0) > 0 || (e.reference ?? "").trim())
    if (!entries.length) continue
    parts.push(
      `${g.label} ${entries.map((e) => `${e.reference || "—"} ${formatCents(e.amountCents)}`).join("; ")}`
    )
  }
  return parts.length > 0 ? parts.join(" · ") : "—"
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1.5 text-sm">
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-medium leading-tight break-words">{value}</span>
    </span>
  )
}

const tableGrid =
  "w-full border-collapse border border-muted-foreground/50 text-xs [&_th]:border [&_td]:border [&_th]:border-muted-foreground/50 [&_td]:border-muted-foreground/50"
const thCompact = "h-8 px-2 py-1 text-xs"
const tdCompact = "px-2 py-1.5 text-xs"

type BreakdownLine = { id: string; method: string; detail: string; amountLabel: string }

function flattenBreakdownLines(breakdown: EnteredBreakdown | null | undefined): BreakdownLine[] {
  if (!breakdown) return []
  const lines: BreakdownLine[] = []
  ;(breakdown.cashDenominations ?? []).forEach((d, i) => {
    lines.push({
      id: `cash-${d.value}-${i}`,
      method: "Cash",
      detail: `${formatDenomLabel(d.value)} × ${d.count}`,
      // cashDenominations.value is stored in LKR, so format as LKR (with thousands separators)
      amountLabel: formatLKR(d.value * d.count),
    })
  })
  ;(
    [
      ["card", breakdown.cardEntries, "Card"],
      ["slip", breakdown.slipEntries, "Slips"],
      ["check", breakdown.checkEntries, "Cheques"],
      ["credit", breakdown.creditEntries, "Credit"],
      ["eWallet", breakdown.eWalletEntries, "E-Wallet"],
    ] as const
  ).forEach(([key, entries, label]) => {
    ;(entries ?? []).forEach((e, i) => {
      lines.push({
        id: `${key}-${i}`,
        method: label,
        detail: e.reference || "—",
        // e.amountCents is stored in cents
        amountLabel: formatCents(e.amountCents),
      })
    })
  })
  return lines
}

/** Shape of each item in data.includedHandovers (linked handovers in the chain). */
type IncludedHandoverRow = {
  id: string
  fromUserId: string
  fromUser: { name: string | null; staff?: { code: string } | null } | null
  shift?: { startedAt?: Date | string } | null
  createdAt?: Date | string
  handoverNoString?: string | null
  totalCents: number
  cashCents?: number
  cardCents?: number
  slipCents?: number
  checkCents?: number
  creditCents?: number
  eWalletCents?: number
  enteredBreakdown?: unknown
}

export default function HandoverDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === "string" ? params.id : ""
  const [data, setData] = useState<HandoverDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [approveOpen, setApproveOpen] = useState(false)
  const [approvalComments, setApprovalComments] = useState("")
  const [sendReconOpen, setSendReconOpen] = useState(false)
  const [changeAssigneeOpen, setChangeAssigneeOpen] = useState(false)
  const [reconcilerUserId, setReconcilerUserId] = useState("")
  const [reconcilerUsers, setReconcilerUsers] = useState<{ id: string; name: string }[]>([])
  const [reconcilerUsersLoading, setReconcilerUsersLoading] = useState(false)
  const [summarySections, setSummarySections] = useState<CashierSummaryReportSection[]>([])
  const { has: hasPermission } = usePermissions()
  const canSendToReconciliation = hasPermission("reconciliation", "submit-for-reconciliation")
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [sendToReconLoading, setSendToReconLoading] = useState(false)
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const fetchDetail = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await getHandoverDetailAction(id)
      if (res.success && res.data) {
        setData(res.data)
        setTicked(new Set())
      } else {
        toast({ title: res.error ?? "Not found", variant: "destructive" })
        router.replace("/handovers")
      }
    } finally {
      setLoading(false)
    }
  }, [id, router, toast])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  useEffect(() => {
    if (!(sendReconOpen || changeAssigneeOpen) || !canSendToReconciliation) return
    setReconcilerUsersLoading(true)
    getReconcilerUserOptionsAction()
      .then((res) => {
        if (res.success && res.data) {
          setReconcilerUsers(res.data.map((u) => ({ id: u.id, name: u.staffCode ? `${u.name} (${u.staffCode})` : u.name })))
        } else {
          setReconcilerUsers([])
        }
      })
      .finally(() => setReconcilerUsersLoading(false))
  }, [sendReconOpen, changeAssigneeOpen, canSendToReconciliation])
  useEffect(() => {
    if (!data) return
    const handover = data.handover
    const included = (data.includedHandovers ?? []) as IncludedHandoverRow[]
    const filters = deriveHandoverCashierSummaryFilters(
      {
        fromUserId: handover.fromUserId,
        createdAt: handover.createdAt,
        shift: handover.shift,
      },
      included.map((h) => ({
        fromUserId: h.fromUserId,
        createdAt: handover.createdAt,
        shift: h.shift,
      }))
    )
    if (!filters) return
    setSummaryLoading(true)
    getCashierSummaryReportData({
      userId: filters.userIds.length === 1 ? filters.userIds[0] : undefined,
      userIds: filters.userIds.length > 1 ? filters.userIds : undefined,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      format: "summary",
    })
      .then((r) => {
        if (r.success && r.sections) setSummarySections(r.sections)
      })
      .catch(() => setSummarySections([]))
      .finally(() => setSummaryLoading(false))
  }, [data])

  const handover = data?.handover
  const tillBreakdown = data?.tillBreakdown
  // enteredBreakdown is stored as JSON; ensure we have a normalised object (server may return plain object or serialised)
  const rawBreakdown = handover?.enteredBreakdown
  const breakdown: EnteredBreakdown | null | undefined =
    rawBreakdown == null
      ? null
      : typeof rawBreakdown === "string"
        ? (() => {
            try {
              return JSON.parse(rawBreakdown) as EnteredBreakdown
            } catch {
              return null
            }
          })()
        : (rawBreakdown as EnteredBreakdown)

  const allTickIds: string[] = []
  if (breakdown?.cashDenominations?.length) {
    breakdown.cashDenominations.forEach((d, i) => allTickIds.push(`cash-${d.value}-${i}`))
  }
  ;["card", "slip", "check", "credit", "eWallet"].forEach((method) => {
    const entries = breakdown?.[`${method}Entries` as keyof EnteredBreakdown] as { reference: string; amountCents: number }[] | undefined
    entries?.forEach((e, i) => allTickIds.push(`${method}-${i}`))
  })
  const allTicked = allTickIds.length > 0 && allTickIds.every((tid) => ticked.has(tid))
  /** Approve and Receive is only enabled when there are no entries to verify, or all entries have been ticked. */
  const canApproveAndReceive = allTickIds.length === 0 || allTicked

  const toggleAll = () => {
    if (allTicked) setTicked(new Set())
    else setTicked(new Set(allTickIds))
  }

  const toggle = (tid: string) => {
    setTicked((prev) => {
      const next = new Set(prev)
      if (next.has(tid)) next.delete(tid)
      else next.add(tid)
      return next
    })
  }

  async function handleApproveAndReceive(comments?: string) {
    if (!id) return
    setActionLoading("approve")
    try {
      await approveHandoverAction(id, comments?.trim() || undefined)
      toast({
        title: "Handover approved and received. Funds recorded to your till; shift ended.",
      })
      setApproveOpen(false)
      setApprovalComments("")
      router.push("/handovers")
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to approve", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRejectSubmit() {
    if (!id || !rejectReason.trim()) return
    setActionLoading("reject")
    try {
      await rejectHandoverAction(id, rejectReason.trim())
      toast({ title: "Handover rejected." })
      setRejectOpen(false)
      setRejectReason("")
      router.push("/handovers")
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to reject", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSendToReconciliation() {
    if (!id || !reconcilerUserId) {
      toast({ title: "Select a user to reconcile", variant: "destructive" })
      return
    }
    setSendToReconLoading(true)
    try {
      const result = await sendHandoverToReconciliationAction(id, reconcilerUserId)
      if (result.success) {
        toast({ title: "Sent to reconciliation for the selected user." })
        setSendReconOpen(false)
        setReconcilerUserId("")
        await fetchDetail()
        router.refresh()
      } else {
        toast({ title: result.error ?? "Failed", variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to send to reconciliation", variant: "destructive" })
    } finally {
      setSendToReconLoading(false)
    }
  }

  async function handleChangeAssignee() {
    if (!id || !reconcilerUserId) {
      toast({ title: "Select a user to reconcile", variant: "destructive" })
      return
    }
    setSendToReconLoading(true)
    try {
      const result = await changeReconciliationAssigneeAction(id, reconcilerUserId)
      if (result.success) {
        toast({ title: "Reconciler updated." })
        setChangeAssigneeOpen(false)
        setReconcilerUserId("")
        await fetchDetail()
        router.refresh()
      } else {
        toast({ title: result.error ?? "Failed", variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to change reconciler", variant: "destructive" })
    } finally {
      setSendToReconLoading(false)
    }
  }
  if (loading || !id) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data || !handover) return null

  const totalCents =
    handover.cashCents +
    handover.cardCents +
    handover.slipCents +
    handover.checkCents +
    handover.creditCents +
    handover.eWalletCents

  const includedHandovers = (data.includedHandovers ?? []) as IncludedHandoverRow[]
  const cashierSummaryFilters = deriveHandoverCashierSummaryFilters(
    {
      fromUserId: handover.fromUserId,
      createdAt: handover.createdAt,
      shift: handover.shift,
    },
    includedHandovers.map((h) => ({
      fromUserId: h.fromUserId,
      createdAt: handover.createdAt,
      shift: h.shift,
    }))
  )
  const cashierSummaryUrl = cashierSummaryFilters
    ? buildCashierSummaryReportUrl(cashierSummaryFilters, "detail")
    : "/reports/cashier-summary"

  const hasIssues = tillBreakdown && METHOD_KEYS.some((key) => (tillBreakdown[key] ?? 0) !== (handover[key] ?? 0))
  const tickProgress = allTickIds.length > 0 ? `${ticked.size} of ${allTickIds.length} checked` : null

  const isPending = handover.status === HANDOVER_STATUS.PENDING
  const isApproved = handover.status === HANDOVER_STATUS.APPROVED
  const isRejected = handover.status === HANDOVER_STATUS.REJECTED
  const reconStatus = handover.reconciliationStatus ?? RECONCILIATION_STATUS.PENDING
  const isApprovedNotReconciled =
    isApproved &&
    !handover.nonCashReconciledAt &&
    handover.forwardedToHandoverId == null &&
    (reconStatus === RECONCILIATION_STATUS.PENDING ||
      (reconStatus === RECONCILIATION_STATUS.IN_RECONCILIATION && !handover.reconciliationAssignedToUserId))
  const isInReconciliation =
    isApproved &&
    !handover.nonCashReconciledAt &&
    handover.forwardedToHandoverId == null &&
    reconStatus === RECONCILIATION_STATUS.IN_RECONCILIATION &&
    !!handover.reconciliationAssignedToUserId
  const assignedUserLabel = data.reconciliationAssignedToUser
    ? fromUserLabel(data.reconciliationAssignedToUser)
    : null
  const shiftLocation = (
    handover.shift as { location?: { name: string; code: string | null } | null } | null | undefined
  )?.location
  const shiftLocationLabel = shiftLocation
    ? `${shiftLocation.name}${shiftLocation.code ? ` (${shiftLocation.code})` : ""}`
    : "—"

  const statusLabel =
    isApproved
      ? "Approved"
      : isRejected
        ? "Rejected"
        : isPending
          ? "Pending"
          : handover.status === HANDOVER_STATUS.CANCELLED
            ? "Cancelled"
            : "Completed"

  const printHandover = (mode: "report" | "summary") => {
    const styleId = "handover-print-page-size"
    let el = document.getElementById(styleId) as HTMLStyleElement | null
    if (!el) {
      el = document.createElement("style")
      el.id = styleId
      document.body.appendChild(el)
    }
    el.textContent =
      mode === "summary"
        ? "@media print { @page { size: A6 portrait; margin: 4mm 12mm; } }"
        : "@media print { @page { size: A4 portrait; margin: 8mm; } }"
    document.body.classList.toggle("print-handover-summary", mode === "summary")
    const cleanup = () => {
      document.body.classList.remove("print-handover-summary")
      el.remove()
    }
    window.addEventListener("afterprint", cleanup, { once: true })
    window.print()
  }

  return (
    <>
    <div className="handover-screen space-y-3 print:hidden">
      {/* Page header with actions — Reject/Approve when pending; Send to reconciliation when approved but not yet reconciled (bulk cashier) */}
      <div className="sticky top-14 z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-2 bg-background border-b border-border print:hidden">
        <BackButton href="/handovers" />
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Printer className="h-4 w-4 mr-1" />
                Print
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => printHandover("summary")}>
                A6 (Default)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => printHandover("report")}>
                A4
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isPending && (
            <>
              <Button variant="outline" onClick={() => setRejectOpen(true)} disabled={!!actionLoading}>
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                onClick={() => setApproveOpen(true)}
                disabled={!!actionLoading || !canApproveAndReceive}
                title={!canApproveAndReceive ? "Tick all entered entries first to approve and receive." : undefined}
              >
                {actionLoading === "approve" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Approve and Receive
              </Button>
            </>
          )}
          {isApprovedNotReconciled && canSendToReconciliation && (
            <>
              <Button
                onClick={() => {
                  setReconcilerUserId("")
                  setSendReconOpen(true)
                }}
                disabled={sendToReconLoading}
              >
                {sendToReconLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileCheck className="h-4 w-4 mr-1" />}
                Send to reconciliation
              </Button>
              <Button variant="outline" asChild>
                <Link href="/reconciliation">Reconciliation page</Link>
              </Button>
            </>
          )}
          {isInReconciliation && canSendToReconciliation && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setReconcilerUserId(handover.reconciliationAssignedToUserId ?? "")
                  setChangeAssigneeOpen(true)
                }}
                disabled={sendToReconLoading}
              >
                Change reconciler
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/reconciliation/${id}`}>Open reconciliation</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Who, when, how much — labeled so each fact is easy to scan */}
      <Card className="print:shadow-none print:break-inside-avoid">
        <CardContent className="p-3 space-y-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Handover from</p>
              <p className="text-lg font-semibold tracking-tight leading-tight">{fromUserLabel(handover.fromUser)}</p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-md border px-3 py-1 text-sm font-semibold uppercase tracking-wide",
                isApproved &&
                  "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-200",
                isRejected &&
                  "border-destructive bg-destructive/10 text-destructive",
                isPending &&
                  "border-amber-500/70 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-950/20 dark:text-amber-200",
                !isApproved &&
                  !isRejected &&
                  !isPending &&
                  "border-muted-foreground/40 bg-muted text-muted-foreground"
              )}
            >
              {statusLabel}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Fact label="Location" value={shiftLocationLabel} />
            <Fact label="Bill No" value={handover.handoverNoString ?? "—"} />
            <Fact label="Shift started" value={formatDateTime(handover.shift?.startedAt)} />
            <Fact label="Handed over" value={formatDateTime(handover.createdAt)} />
            {isApproved ? (
              <>
                <Fact label="Approved" value={formatDateTime(handover.approvedAt)} />
                <Fact label="By" value={fromUserLabel(data.approvedByUser)} />
                {isInReconciliation ? (
                  <Fact label="Reconciler" value={assignedUserLabel ?? "—"} />
                ) : null}
              </>
            ) : null}
            {isRejected ? (
              <>
                <Fact label="Rejected" value={formatDateTime(handover.rejectedAt)} />
                <Fact label="By" value={fromUserLabel(data.rejectedByUser)} />
              </>
            ) : null}
          </div>

          {(isApproved && handover.approvalComments?.trim()) ||
          (isRejected && handover.rejectReason?.trim()) ||
          (!isPending && handover.discrepancyReason?.trim()) ? (
            <div className="space-y-1 text-sm">
              {isApproved && handover.approvalComments?.trim() ? (
                <p>
                  <span className="text-muted-foreground">Comments: </span>
                  {handover.approvalComments.trim()}
                </p>
              ) : null}
              {isRejected && handover.rejectReason?.trim() ? (
                <p>
                  <span className="text-muted-foreground">Reject reason: </span>
                  {handover.rejectReason.trim()}
                </p>
              ) : null}
              {!isPending && handover.discrepancyReason?.trim() ? (
                <p>
                  <span className="text-muted-foreground">Discrepancy: </span>
                  {handover.discrepancyReason.trim()}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t pt-2 text-sm">
            <span className="font-bold tabular-nums">LKR {formatCents(totalCents)}</span>
            {METHOD_KEYS.filter((k) => (handover[k] ?? 0) > 0).map((key) => {
              const Icon = METHOD_ICONS[key]
              return (
                <span key={key} className="inline-flex items-center gap-1 text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  {METHOD_LABELS[key]}{" "}
                  <span className="font-medium text-foreground tabular-nums">{formatCents(handover[key] ?? 0)}</span>
                </span>
              )
            })}
          </div>

          {/* Summary: cashier shift info — value from cashier summary grand totals (same as print) */}
          {(() => {
            const cs = data.cashierSummary
            const summaryValueCents = cs
              ? Math.round((cs.grandTotals.cash + cs.grandTotals.creditCard + cs.grandTotals.slip + cs.grandTotals.cheque + cs.grandTotals.agent + cs.grandTotals.agentCredit + cs.grandTotals.eWallet) * 100)
              : totalCents
            return (
              <div className="border-t pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Summary</h4>
                <Table className={tableGrid}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={thCompact}>Name</TableHead>
                      <TableHead className={thCompact}>No</TableHead>
                      <TableHead className={thCompact}>From</TableHead>
                      <TableHead className={thCompact}>To</TableHead>
                      <TableHead className={`${thCompact} text-right`}>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className={`${tdCompact} whitespace-nowrap font-medium`}>
                        {fromUserLabel(handover.fromUser)}
                      </TableCell>
                      <TableCell className={`${tdCompact} whitespace-nowrap tabular-nums text-muted-foreground`}>
                        {handover.shift?.id ? handover.shift.id.slice(-8).toUpperCase() : "—"}
                      </TableCell>
                      <TableCell className={`${tdCompact} whitespace-nowrap tabular-nums`}>
                        {formatDateTime(handover.shift?.startedAt)}
                      </TableCell>
                      <TableCell className={`${tdCompact} whitespace-nowrap tabular-nums`}>
                        {formatDateTime(handover.createdAt)}
                      </TableCell>
                      <TableCell className={`${tdCompact} text-right tabular-nums font-medium`}>
                        {formatCents(summaryValueCents)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Floats and previous handovers on the shift being handed over */}
      {(() => {
        const receivedFloats = data.receivedFloats ?? []
        const inTotalCents = receivedFloats
          .filter((f) => f.direction !== "out" && f.status === FLOAT_REQUEST_STATUS.RECEIVED)
          .reduce((sum, f) => sum + (f.amountReceivedCents ?? 0), 0)
        const outTotalCents = receivedFloats
          .filter((f) => f.direction === "out" && f.status === FLOAT_REQUEST_STATUS.RECEIVED)
          .reduce((sum, f) => sum + (f.amountReceivedCents ?? 0), 0)
        const rows = (data.includedHandovers ?? []) as IncludedHandoverRow[]
        const methodCols = METHOD_KEYS.filter((key) => rows.some((h) => (h[key] ?? 0) > 0))
        if (receivedFloats.length === 0 && rows.length === 0) return null
        return (
          <Card>
            <CardContent className="p-3 space-y-3">
              {(() => {
                const floatsIn = receivedFloats.filter((f) => f.direction !== "out")
                const floatsOut = receivedFloats.filter((f) => f.direction === "out")
                const renderFloatTable = (floats: typeof receivedFloats, label: string, totalCentsVal: number) => {
                  if (floats.length === 0) return null
                  return (
                    <div>
                      <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                        <Banknote className="h-4 w-4" />
                        {label}
                      </h3>
                      <Table className={tableGrid}>
                        <TableHeader>
                          <TableRow>
                            <TableHead className={thCompact}>Bill No</TableHead>
                            <TableHead className={thCompact}>Status</TableHead>
                            <TableHead className={thCompact}>Party</TableHead>
                            <TableHead className={`${thCompact} text-right`}>Requested</TableHead>
                            <TableHead className={`${thCompact} text-right`}>Given</TableHead>
                            <TableHead className={thCompact}>When</TableHead>
                            <TableHead className={thCompact}>Denoms</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {floats.map((f) => {
                            const isOut = f.direction === "out"
                            const party = isOut ? f.requestedBy?.name : f.bulkCashier?.name
                            const givenDenoms = f.denominationsApproved?.length
                              ? f.denominationsApproved
                              : f.status === FLOAT_REQUEST_STATUS.RECEIVED
                                ? f.denominationsRequested
                                : []
                            const givenCents =
                              f.status === FLOAT_REQUEST_STATUS.RECEIVED ||
                              (f.status === FLOAT_REQUEST_STATUS.APPROVED && (f.denominationsApproved?.length ?? 0) > 0)
                                ? f.amountReceivedCents
                                : null
                            const when =
                              f.status === FLOAT_REQUEST_STATUS.RECEIVED
                                ? f.receivedAt
                                : f.approvedAt ?? f.createdAt
                            return (
                              <TableRow key={f.id}>
                                <TableCell className={`${tdCompact} whitespace-nowrap tabular-nums`}>
                                  {f.floatNoString ?? "—"}
                                </TableCell>
                                <TableCell className={`${tdCompact} whitespace-nowrap font-medium`}>
                                  {floatRequestStatusLabel(f.status)}
                                </TableCell>
                                <TableCell className={`${tdCompact} whitespace-nowrap`}>{party ?? "—"}</TableCell>
                                <TableCell className={`${tdCompact} text-right tabular-nums`}>
                                  {formatCents(f.amountRequested)}
                                </TableCell>
                                <TableCell className={`${tdCompact} text-right tabular-nums`}>
                                  {givenCents != null ? formatCents(givenCents) : "—"}
                                </TableCell>
                                <TableCell className={`${tdCompact} whitespace-nowrap text-muted-foreground`}>
                                  {formatDateTime(when)}
                                </TableCell>
                                <TableCell className={`${tdCompact} text-muted-foreground tabular-nums max-w-[12rem]`}>
                                  {denomSummary(givenDenoms.length ? givenDenoms : f.denominationsRequested)}
                                  {f.reasonForLessThanRequested ? (
                                    <span className="block text-[11px]">{f.reasonForLessThanRequested}</span>
                                  ) : null}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          <TableRow className="border-t-2 font-medium bg-muted/30">
                            <TableCell className={tdCompact} colSpan={4}>Total</TableCell>
                            <TableCell className={`${tdCompact} text-right tabular-nums`}>{formatCents(totalCentsVal)}</TableCell>
                            <TableCell className={tdCompact} colSpan={2} />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )
                }
                return (
                  <>
                    {renderFloatTable(floatsIn, "Floats In", inTotalCents)}
                    {renderFloatTable(floatsOut, "Floats Out", outTotalCents)}
                  </>
                )
              })()}

              {rows.length > 0 ? (
                <div>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                    <GitBranch className="h-4 w-4" />
                    Previous handovers
                  </h3>
                  <Table className={tableGrid}>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={thCompact}>Bill No</TableHead>
                        <TableHead className={thCompact}>From</TableHead>
                        <TableHead className={thCompact}>When</TableHead>
                        {methodCols.map((key) => (
                          <TableHead key={key} className={`${thCompact} text-right`}>
                            {METHOD_LABELS[key]}
                          </TableHead>
                        ))}
                        <TableHead className={`${thCompact} text-right`}>Total</TableHead>
                        <TableHead className={thCompact}>Breakdown</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className={`${tdCompact} whitespace-nowrap tabular-nums`}>
                            {h.handoverNoString ?? "—"}
                          </TableCell>
                          <TableCell className={`${tdCompact} font-medium whitespace-nowrap`}>
                            {fromUserLabel(h.fromUser)}
                          </TableCell>
                          <TableCell className={`${tdCompact} whitespace-nowrap text-muted-foreground`}>
                            {formatDateTime(h.createdAt ?? h.shift?.startedAt)}
                          </TableCell>
                          {methodCols.map((key) => (
                            <TableCell key={key} className={`${tdCompact} text-right tabular-nums`}>
                              {(h[key] ?? 0) > 0 ? formatCents(h[key] ?? 0) : "—"}
                            </TableCell>
                          ))}
                          <TableCell className={`${tdCompact} text-right tabular-nums font-medium`}>
                            {formatCents(h.totalCents)}
                          </TableCell>
                          <TableCell className={`${tdCompact} text-muted-foreground max-w-[16rem]`}>
                            {handoverBreakdownSummary(h.enteredBreakdown)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 font-medium bg-muted/30">
                        <TableCell className={tdCompact} colSpan={3}>Total</TableCell>
                        {methodCols.map((key) => {
                          const colTotal = rows.reduce((s, h) => s + (h[key] ?? 0), 0)
                          return (
                            <TableCell key={key} className={`${tdCompact} text-right tabular-nums`}>
                              {colTotal > 0 ? formatCents(colTotal) : "—"}
                            </TableCell>
                          )
                        })}
                        <TableCell className={`${tdCompact} text-right tabular-nums`}>
                          {formatCents(rows.reduce((s, h) => s + h.totalCents, 0))}
                        </TableCell>
                        <TableCell className={tdCompact} />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )
      })()}

      {/* Collection breakdown: IN + Summary + Previous - OUT */}
      {(() => {
        const receivedFloats = data.receivedFloats ?? []
        const floatsInTotal = receivedFloats
          .filter((f) => f.direction !== "out" && f.status === FLOAT_REQUEST_STATUS.RECEIVED)
          .reduce((s, f) => s + (f.amountReceivedCents ?? 0), 0)
        const floatsOutTotal = receivedFloats
          .filter((f) => f.direction === "out" && f.status === FLOAT_REQUEST_STATUS.RECEIVED)
          .reduce((s, f) => s + (f.amountReceivedCents ?? 0), 0)
        const prevTotal = includedHandovers.reduce((s, h) => s + h.totalCents, 0)
        const cs = data.cashierSummary
        const summaryVal = cs
          ? Math.round((cs.grandTotals.cash + cs.grandTotals.creditCard + cs.grandTotals.slip + cs.grandTotals.cheque + cs.grandTotals.agent + cs.grandTotals.agentCredit + cs.grandTotals.eWallet) * 100)
          : totalCents
        const collectionTotal = floatsInTotal + summaryVal + prevTotal - floatsOutTotal
        const parts: { label: string; cents: number; sign: "+" | "−" }[] = []
        if (floatsInTotal > 0) parts.push({ label: "Floats In", cents: floatsInTotal, sign: "+" })
        parts.push({ label: "Summary", cents: summaryVal, sign: "+" })
        if (prevTotal > 0) parts.push({ label: "Previous Handovers", cents: prevTotal, sign: "+" })
        if (floatsOutTotal > 0) parts.push({ label: "Floats Out", cents: floatsOutTotal, sign: "−" })
        return (
          <Card className="border-blue-500/30 bg-blue-50/30 dark:bg-blue-950/20">
            <CardContent className="p-3">
              <div className="space-y-0.5 text-sm">
                {parts.map((p, i) => (
                  <div key={p.label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">
                      {i === 0 ? "" : `${p.sign} `}{p.label}
                    </span>
                    <span className="tabular-nums">{p.sign === "−" ? `(${formatCents(p.cents)})` : formatCents(p.cents)}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-blue-500/30 pt-1 font-bold">
                  <span>Total Collection</span>
                  <span className="tabular-nums">LKR {formatCents(collectionTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {isPending && (hasIssues || handover.discrepancyReason) && (
        <Alert variant="destructive" className="border-amber-500/70 bg-amber-50 py-2 dark:bg-amber-950/30 dark:border-amber-500/50">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle className="text-sm">Issues detected</AlertTitle>
          <AlertDescription className="space-y-1 text-xs">
            {tillBreakdown && (() => {
              const diffs = METHOD_KEYS.filter((key) => (tillBreakdown[key] ?? 0) !== (handover[key] ?? 0)).map((key) => ({
                method: METHOD_LABELS[key],
                expected: tillBreakdown[key] ?? 0,
                entered: handover[key] ?? 0,
                diff: (handover[key] ?? 0) - (tillBreakdown[key] ?? 0),
              }))
              if (diffs.length === 0) return null
              return (
                <p>
                  Till vs entered:{" "}
                  {diffs.map((d) => (
                    <span key={d.method} className="mr-2">
                      <strong>{d.method}</strong>{" "}
                      <span className={d.diff < 0 ? "text-destructive font-medium" : "text-amber-600 dark:text-amber-400 font-medium"}>
                        ({d.diff < 0 ? "Short" : "Over"} {formatCents(Math.abs(d.diff))})
                      </span>
                    </span>
                  ))}
                </p>
              )
            })()}
            {handover.discrepancyReason && (
              <p>
                <strong>Cashier&apos;s reason:</strong> {handover.discrepancyReason}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isApprovedNotReconciled && canSendToReconciliation && (
        <Alert className="border-blue-500/50 bg-blue-50 py-2 dark:bg-blue-950/30 dark:border-blue-500/40 print:hidden">
          <FileCheck className="h-4 w-4" />
          <AlertTitle className="text-sm">Approved — not yet in reconciliation</AlertTitle>
          <AlertDescription className="text-xs">
            Use <strong>Send to reconciliation</strong> above and choose who should reconcile it.
          </AlertDescription>
        </Alert>
      )}
      {isInReconciliation && (
        <Alert className="border-blue-500/50 bg-blue-50 py-2 dark:bg-blue-950/30 dark:border-blue-500/40 print:hidden">
          <FileCheck className="h-4 w-4" />
          <AlertTitle className="text-sm">In reconciliation</AlertTitle>
          <AlertDescription className="text-xs">
            Assigned to <strong>{assignedUserLabel ?? "—"}</strong>. You can change the reconciler until it is completed.
          </AlertDescription>
        </Alert>
      )}

      {/* Entries handed over: full breakdown (read-only) for any completed/approved/rejected view */}
      {!isPending && (() => {
        const lines = flattenBreakdownLines(breakdown)
        return (
          <Card className="border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20">
            <CardContent className="p-3 space-y-2">
              <h3 className="text-sm font-semibold">
                {handover.status === HANDOVER_STATUS.APPROVED ? "Entries received" : "Entries handed over"}
              </h3>
              {lines.length > 0 ? (
                <Table className={tableGrid}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={thCompact}>Method</TableHead>
                      <TableHead className={thCompact}>Detail</TableHead>
                      <TableHead className={`${thCompact} text-right`}>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.id} className="!bg-emerald-50/50 dark:!bg-emerald-950/30">
                        <TableCell className={`${tdCompact} whitespace-nowrap`}>{line.method}</TableCell>
                        <TableCell className={tdCompact}>{line.detail}</TableCell>
                        <TableCell className={`${tdCompact} text-right tabular-nums`}>{line.amountLabel}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 font-medium bg-muted/30">
                      <TableCell className={tdCompact} colSpan={2}>
                        Total
                      </TableCell>
                      <TableCell className={`${tdCompact} text-right tabular-nums`}>LKR {formatCents(totalCents)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <p className="text-xs text-muted-foreground">No per-line breakdown saved. Totals above still apply.</p>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* Entries to check: tick when verified (only when still pending approval) */}
      {isPending && (
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Entries to verify</h3>
              <p className="text-xs text-muted-foreground">
                {allTickIds.length > 0
                  ? "Tick each line when checked. All must be ticked to approve."
                  : "No per-line breakdown was saved. Approve using totals and till comparison."}
              </p>
            </div>
            {allTickIds.length > 0 && (
              <div className="flex items-center gap-2">
                {tickProgress && (
                  <span className="text-xs text-muted-foreground tabular-nums">{tickProgress}</span>
                )}
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {allTicked ? "Deselect all" : "Select all"}
                </Button>
              </div>
            )}
          </div>
          {(() => {
            const lines = flattenBreakdownLines(breakdown)
            if (lines.length === 0) {
              return (
                <p className="text-xs text-muted-foreground">
                  {breakdown == null
                    ? "No denomination or reference breakdown was saved. Use till comparison below."
                    : "No entries recorded."}
                </p>
              )
            }
            return (
              <Table className={tableGrid}>
                <TableHeader>
                  <TableRow>
                    <TableHead className={`${thCompact} w-8`}>Tick</TableHead>
                    <TableHead className={thCompact}>Method</TableHead>
                    <TableHead className={thCompact}>Detail</TableHead>
                    <TableHead className={`${thCompact} text-right`}>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => {
                    const isTicked = ticked.has(line.id)
                    return (
                      <TableRow
                        key={line.id}
                        className={`transition-colors ${isTicked ? "!bg-emerald-50 dark:!bg-emerald-950/40 hover:!bg-emerald-100 dark:hover:!bg-emerald-900/50" : ""}`}
                      >
                        <TableCell className={`${tdCompact} ${isTicked ? "border-l-4 border-l-emerald-500 bg-inherit" : ""}`}>
                          <Checkbox checked={isTicked} onCheckedChange={() => toggle(line.id)} />
                        </TableCell>
                        <TableCell className={`${tdCompact} whitespace-nowrap`}>{line.method}</TableCell>
                        <TableCell className={tdCompact}>{line.detail}</TableCell>
                        <TableCell className={`${tdCompact} text-right tabular-nums`}>{line.amountLabel}</TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="border-t-2 font-medium bg-muted/30">
                    <TableCell className={tdCompact} colSpan={3}>
                      Total
                    </TableCell>
                    <TableCell className={`${tdCompact} text-right tabular-nums`}>LKR {formatCents(totalCents)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )
          })()}

          {tillBreakdown ? (
            <div>
              <h4 className="mb-1.5 text-sm font-semibold">Till vs entered</h4>
              <Table className={tableGrid}>
                <TableHeader>
                  <TableRow>
                    <TableHead className={thCompact}>Method</TableHead>
                    <TableHead className={`${thCompact} text-right`}>Till</TableHead>
                    <TableHead className={`${thCompact} text-right`}>Entered</TableHead>
                    <TableHead className={`${thCompact} text-right`}>Diff</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {METHOD_KEYS.filter((key) => (tillBreakdown[key] ?? 0) !== 0 || (handover[key] ?? 0) !== 0).map((key) => {
                    const expected = tillBreakdown[key] ?? 0
                    const entered = handover[key] ?? 0
                    const diff = entered - expected
                    const isShort = diff < 0
                    const isOver = diff > 0
                    return (
                      <TableRow key={key}>
                        <TableCell className={tdCompact}>{METHOD_LABELS[key]}</TableCell>
                        <TableCell className={`${tdCompact} text-right tabular-nums`}>{formatCents(expected)}</TableCell>
                        <TableCell className={`${tdCompact} text-right tabular-nums`}>{formatCents(entered)}</TableCell>
                        <TableCell
                          className={`${tdCompact} text-right tabular-nums ${isShort ? "text-destructive font-medium" : isOver ? "text-amber-600 dark:text-amber-400 font-medium" : ""}`}
                        >
                          {diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${formatCents(diff)}`}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
      )}

      {/* Need full receipt-level detail: single CTA to summary report */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm print:hidden">
        <p className="text-muted-foreground">
          {summaryLoading
            ? "Loading…"
            : !cashierSummaryFilters
              ? "Open the cashier summary for receipts and export."
              : (() => {
                  const receiptCount = summarySections.reduce((n, s) => n + s.rows.length, 0)
                  const cashierCount = cashierSummaryFilters.userIds.length
                  const chainNote =
                    includedHandovers.length > 0
                      ? ` Covers ${cashierCount} cashier${cashierCount === 1 ? "" : "s"} including ${includedHandovers.length} linked handover${includedHandovers.length === 1 ? "" : "s"}.`
                      : cashierCount > 1
                        ? ` Covers ${cashierCount} cashiers.`
                        : ""
                  return summarySections.length === 0
                    ? `Cashier summary for full detail.${chainNote}`
                    : `${receiptCount} receipt(s). Open cashier summary for full detail.${chainNote}`
                })()}
        </p>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link href={cashierSummaryUrl} target="_blank" rel="noopener noreferrer">
            <FileText className="h-4 w-4 mr-1.5" />
            Cashier summary
            <ExternalLink className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>

      {/* Approve and Receive dialog: optional comments */}
      {approveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Approve and Receive</CardTitle>
              <CardDescription>
                Funds will be recorded to your till and a journal entry created. You can add optional comments (e.g. notes for records). Send to reconciliation is a separate step after approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="approval-comments">Comments (optional)</Label>
                <Textarea
                  id="approval-comments"
                  placeholder="e.g. Count verified; received as entered"
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => (setApproveOpen(false), setApprovalComments(""))} disabled={!!actionLoading}>
                  Cancel
                </Button>
                <Button onClick={() => handleApproveAndReceive(approvalComments)} disabled={!!actionLoading}>
                  {actionLoading === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Approve and Receive
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Send to reconciliation: pick assignee */}
      {sendReconOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Send to reconciliation</CardTitle>
              <CardDescription>
                Choose who should reconcile this handover. Only users with the{" "}
                <strong>Approve Reconciliation</strong> permission are listed. Only that user can submit or reject.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Reconciler</Label>
                <div className="mt-1">
                  <SearchableUserSelect
                    options={reconcilerUsers}
                    value={reconcilerUserId}
                    onChange={setReconcilerUserId}
                    placeholder={
                      reconcilerUsersLoading
                        ? "Loading…"
                        : reconcilerUsers.length === 0
                          ? "No users with Approve Reconciliation"
                          : "Select reconciler"
                    }
                    disabled={reconcilerUsersLoading || sendToReconLoading || reconcilerUsers.length === 0}
                    label="reconciler"
                  />
                </div>
                {!reconcilerUsersLoading && reconcilerUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No active users have the Approve Reconciliation permission. Grant it on a user group first.
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSendReconOpen(false)
                    setReconcilerUserId("")
                  }}
                  disabled={sendToReconLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSendToReconciliation} disabled={sendToReconLoading || !reconcilerUserId}>
                  {sendToReconLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileCheck className="h-4 w-4 mr-1" />}
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Change reconciler */}
      {changeAssigneeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Change reconciler</CardTitle>
              <CardDescription>
                Assign a different user with <strong>Approve Reconciliation</strong>. Only possible before reconciliation is completed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Reconciler</Label>
                <div className="mt-1">
                  <SearchableUserSelect
                    options={reconcilerUsers}
                    value={reconcilerUserId}
                    onChange={setReconcilerUserId}
                    placeholder={
                      reconcilerUsersLoading
                        ? "Loading…"
                        : reconcilerUsers.length === 0
                          ? "No users with Approve Reconciliation"
                          : "Select reconciler"
                    }
                    disabled={reconcilerUsersLoading || sendToReconLoading || reconcilerUsers.length === 0}
                    label="reconciler"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setChangeAssigneeOpen(false)
                    setReconcilerUserId("")
                  }}
                  disabled={sendToReconLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleChangeAssignee} disabled={sendToReconLoading || !reconcilerUserId}>
                  {sendToReconLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reject dialog */}
      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Reject handover</CardTitle>
              <CardDescription>Provide a reason. The sender will see it and the shift will return to active.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reject-reason">Reason (required)</Label>
                <Textarea
                  id="reject-reason"
                  placeholder="e.g. Amounts don't match my count"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => (setRejectOpen(false), setRejectReason(""))}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleRejectSubmit} disabled={!rejectReason.trim() || !!actionLoading}>
                  {actionLoading === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
      <HandoverCashInPrint
        handover={handover}
        receivedFloats={data.receivedFloats ?? []}
        includedHandovers={includedHandovers}
        cashierSummary={data.cashierSummary}
        tillBreakdown={tillBreakdown}
        approvedByUser={data.approvedByUser}
        rejectedByUser={data.rejectedByUser}
      />
      <HandoverSummaryPrint
        handover={handover}
        receivedFloats={data.receivedFloats ?? []}
        includedHandovers={includedHandovers}
        cashierSummary={data.cashierSummary}
        tillBreakdown={tillBreakdown}
      />
    </>
  )
}
