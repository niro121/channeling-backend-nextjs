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
import { formatCents } from "@/lib/format-money"
import {
  buildCashierSummaryReportUrl,
  deriveHandoverCashierSummaryFilters,
} from "@/lib/handover-utils"
import { formatDenomLabel } from "@/types/float-request"
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
} from "lucide-react"
import { BackButton } from "@/components/common/back-button"
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

/** Shape of each item in data.includedHandovers (linked handovers in the chain). */
type IncludedHandoverRow = {
  id: string
  fromUserId: string
  fromUser: { name: string | null; staff?: { code: string } | null } | null
  shift?: { startedAt?: Date | string } | null
  totalCents: number
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

  if (!handover) return null

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

  const statusLabel =
    isApproved
      ? "Approved"
      : isRejected
        ? "Rejected"
        : handover.status === HANDOVER_STATUS.CANCELLED
          ? "Cancelled"
          : "Completed"

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Page header with actions — Reject/Approve when pending; Send to reconciliation when approved but not yet reconciled (bulk cashier) */}
      <div className="sticky top-14 z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-3 bg-background border-b border-border print:hidden">
        <BackButton href="/handovers" />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />
            Print / PDF
          </Button>
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

      {/* Who & how much: clear at a glance */}
      <Card className="border-2 print:shadow-none print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Handover from</p>
                <p className="text-xl font-semibold mt-0.5">{fromUserLabel(handover.fromUser)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Shift: {handover.shift?.startedAt ? new Date(handover.shift.startedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"}
                  {" → "}
                  Handover at {handover.createdAt ? new Date(handover.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"}
                </p>
                {!isPending && (
                  <div className="mt-2 space-y-1 text-sm">
                    {isApproved && (
                      <>
                        <p>
                          <span className="text-muted-foreground">Approved at: </span>
                          <span className="font-medium">
                            {handover.approvedAt
                              ? new Date(handover.approvedAt).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : "—"}
                          </span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Approved by: </span>
                          <span className="font-medium">{fromUserLabel(data.approvedByUser)}</span>
                        </p>
                        {handover.approvalComments?.trim() ? (
                          <p>
                            <span className="text-muted-foreground">Approval comments: </span>
                            <span>{handover.approvalComments.trim()}</span>
                          </p>
                        ) : null}
                        {isInReconciliation && (
                          <p>
                            <span className="text-muted-foreground">Reconciler: </span>
                            <span className="font-medium">{assignedUserLabel ?? "—"}</span>
                          </p>
                        )}
                      </>
                    )}
                    {isRejected && (
                      <>
                        <p>
                          <span className="text-muted-foreground">Rejected at: </span>
                          <span className="font-medium">
                            {handover.rejectedAt
                              ? new Date(handover.rejectedAt).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : "—"}
                          </span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Rejected by: </span>
                          <span className="font-medium">{fromUserLabel(data.rejectedByUser)}</span>
                        </p>
                        {handover.rejectReason?.trim() ? (
                          <p>
                            <span className="text-muted-foreground">Reject reason: </span>
                            <span>{handover.rejectReason.trim()}</span>
                          </p>
                        ) : null}
                      </>
                    )}
                    {handover.discrepancyReason?.trim() ? (
                      <p>
                        <span className="text-muted-foreground">Cashier discrepancy reason: </span>
                        <span>{handover.discrepancyReason.trim()}</span>
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
              {!isPending && (
                <div
                  className={cn(
                    "shrink-0 self-start rounded-lg border-2 px-4 py-2.5 text-center sm:min-w-[9rem]",
                    isApproved &&
                      "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-200",
                    isRejected &&
                      "border-destructive bg-destructive/10 text-destructive",
                    !isApproved &&
                      !isRejected &&
                      "border-muted-foreground/40 bg-muted text-muted-foreground"
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Status</p>
                  <p className="text-2xl font-bold leading-tight tracking-tight">{statusLabel}</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t pt-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total handed over</p>
                <p className="text-2xl font-bold tabular-nums">LKR {formatCents(totalCents)}</p>
              </div>
              {METHOD_KEYS.filter((k) => (handover[k] ?? 0) > 0).map((key) => (
                <div key={key} className="text-sm">
                  <span className="text-muted-foreground">{METHOD_LABELS[key]}: </span>
                  <span className="font-medium tabular-nums">{formatCents(handover[key] ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Included handovers (chain): handovers the sender is passing on — read-only */}
      {data.includedHandovers && data.includedHandovers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Included handovers
            </CardTitle>
            <CardDescription>
              This handover includes the following handovers that were received earlier (passed on in this transfer).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>Shift date</TableHead>
                  <TableHead className="text-right">Total (LKR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.includedHandovers.map((h: IncludedHandoverRow) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{fromUserLabel(h.fromUser)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {h.shift?.startedAt
                        ? new Date(h.shift.startedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatCents(h.totalCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Issues: only when pending (not needed after approval; balances have moved) */}
      {isPending && (hasIssues || handover.discrepancyReason) && (
        <Alert variant="destructive" className="border-amber-500/70 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-500/50">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>Issues detected</AlertTitle>
          <AlertDescription className="space-y-2">
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
                  Till balance does not match entered amounts:{" "}
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
        <Alert className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-500/40 print:hidden">
          <FileCheck className="h-4 w-4" />
          <AlertTitle>Approved — not yet in reconciliation</AlertTitle>
          <AlertDescription>
            This handover is approved. Use <strong>Send to reconciliation</strong> above and choose who should reconcile it.
          </AlertDescription>
        </Alert>
      )}
      {isInReconciliation && (
        <Alert className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-500/40 print:hidden">
          <FileCheck className="h-4 w-4" />
          <AlertTitle>In reconciliation</AlertTitle>
          <AlertDescription>
            Assigned to <strong>{assignedUserLabel ?? "—"}</strong>. You can change the reconciler until it is completed.
          </AlertDescription>
        </Alert>
      )}

      {/* Entries handed over: full breakdown (read-only) for any completed/approved/rejected view */}
      {!isPending && (() => {
        const hasBreakdown =
          breakdown?.cashDenominations?.length ||
          breakdown?.cardEntries?.length ||
          breakdown?.slipEntries?.length ||
          breakdown?.checkEntries?.length ||
          breakdown?.creditEntries?.length ||
          breakdown?.eWalletEntries?.length
        return (
          <Card className="border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {handover.status === HANDOVER_STATUS.APPROVED
                  ? "Entries received"
                  : "Entries handed over"}
              </CardTitle>
              <CardDescription>
                {hasBreakdown
                  ? "Same breakdown as when this handover was submitted. Shown read-only for reference."
                  : "No per-line denomination or reference breakdown was saved for this handover. Totals above still reflect what was handed over."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {breakdown?.cashDenominations?.length ? (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Banknote className="h-4 w-4" />
                    Cash denominations
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">✓</TableHead>
                        <TableHead>Denomination</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Amount (LKR)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {breakdown.cashDenominations.map((d, i) => (
                        <TableRow key={i} className="!bg-emerald-50/50 dark:!bg-emerald-950/30">
                          <TableCell className="border-l-4 border-l-emerald-500 text-emerald-600">✓</TableCell>
                          <TableCell>{formatDenomLabel(d.value)}</TableCell>
                          <TableCell className="text-right tabular-nums">{d.count}</TableCell>
                          <TableCell className="text-right tabular-nums">{(d.value * d.count).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 font-medium bg-muted/30">
                        <TableCell colSpan={3} />
                        <TableCell className="text-right tabular-nums">LKR {formatCents(handover.cashCents)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : null}
              {[
                { key: "card" as const, entries: breakdown?.cardEntries, label: "Card", Icon: CreditCard, centsKey: "cardCents" as const },
                { key: "slip" as const, entries: breakdown?.slipEntries, label: "Slips", Icon: SlipIcon, centsKey: "slipCents" as const },
                { key: "check" as const, entries: breakdown?.checkEntries, label: "Cheques", Icon: Receipt, centsKey: "checkCents" as const },
                { key: "credit" as const, entries: breakdown?.creditEntries, label: "Credit", Icon: Wallet, centsKey: "creditCents" as const },
                { key: "eWallet" as const, entries: breakdown?.eWalletEntries, label: "E-Wallet", Icon: Smartphone, centsKey: "eWalletCents" as const },
              ].map(
                ({ key, entries, label, Icon, centsKey }) =>
                  entries?.length ? (
                    <div key={key}>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">✓</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead className="text-right">Amount (LKR)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entries.map((e, i) => (
                            <TableRow key={i} className="!bg-emerald-50/50 dark:!bg-emerald-950/30">
                              <TableCell className="border-l-4 border-l-emerald-500 text-emerald-600">✓</TableCell>
                              <TableCell>{e.reference || "—"}</TableCell>
                              <TableCell className="text-right tabular-nums">{(e.amountCents / 100).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t-2 font-medium bg-muted/30">
                            <TableCell colSpan={2} />
                            <TableCell className="text-right tabular-nums">LKR {formatCents(handover[centsKey] ?? 0)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  ) : null
              )}
              {!hasBreakdown && (
                <div className="rounded-md border bg-background/60 p-3">
                  <p className="text-sm font-medium mb-2">Amounts by method</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    {METHOD_KEYS.filter((k) => (handover[k] ?? 0) > 0).map((key) => (
                      <div key={key}>
                        <span className="text-muted-foreground">{METHOD_LABELS[key]}: </span>
                        <span className="font-medium tabular-nums">{formatCents(handover[key] ?? 0)}</span>
                      </div>
                    ))}
                    {METHOD_KEYS.every((k) => (handover[k] ?? 0) === 0) && (
                      <span className="text-muted-foreground">No method amounts recorded.</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* Entries to check: tick when verified (only when still pending approval) */}
      {isPending && (
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Entries to verify</CardTitle>
              <CardDescription>
                {allTickIds.length > 0
                  ? "Tick each line when you have checked it. When all are ticked you can Approve and Receive."
                  : "No per-line breakdown was saved for this handover. You can still approve using the totals above and the till details below."}
              </CardDescription>
            </div>
            {allTickIds.length > 0 && (
              <div className="flex items-center gap-2">
                {tickProgress && (
                  <span className="text-sm text-muted-foreground tabular-nums">{tickProgress}</span>
                )}
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {allTicked ? "Deselect all" : "Select all"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {breakdown?.cashDenominations?.length ? (
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <Banknote className="h-4 w-4" />
                Cash denominations
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Tick</TableHead>
                    <TableHead>Denomination</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Amount (LKR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.cashDenominations.map((d, i) => {
                    const tid = `cash-${d.value}-${i}`
                    const isTicked = ticked.has(tid)
                    return (
                      <TableRow
                        key={tid}
                        className={`transition-colors ${isTicked ? "!bg-emerald-50 dark:!bg-emerald-950/40 hover:!bg-emerald-100 dark:hover:!bg-emerald-900/50" : ""}`}
                      >
                        <TableCell className={isTicked ? "border-l-4 border-l-emerald-500 bg-inherit" : undefined}>
                          <Checkbox checked={isTicked} onCheckedChange={() => toggle(tid)} />
                        </TableCell>
                        <TableCell>{formatDenomLabel(d.value)}</TableCell>
                        <TableCell className="text-right tabular-nums">{d.count}</TableCell>
                        <TableCell className="text-right tabular-nums">{(d.value * d.count).toFixed(2)}</TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="border-t-2 font-medium bg-muted/30">
                    <TableCell colSpan={3} />
                    <TableCell className="text-right tabular-nums">
                      LKR {formatCents(handover.cashCents)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {breakdown == null
                ? "No denomination or reference breakdown was saved for this handover (it may have been submitted before this feature was added). Use the Till details below to verify totals."
                : "No cash denominations recorded."}
            </p>
          )}

          {[
            { key: "card" as const, entries: breakdown?.cardEntries, label: "Card", Icon: CreditCard, centsKey: "cardCents" as const },
            { key: "slip" as const, entries: breakdown?.slipEntries, label: "Slips", Icon: SlipIcon, centsKey: "slipCents" as const },
            { key: "check" as const, entries: breakdown?.checkEntries, label: "Cheques", Icon: Receipt, centsKey: "checkCents" as const },
            { key: "credit" as const, entries: breakdown?.creditEntries, label: "Credit", Icon: Wallet, centsKey: "creditCents" as const },
            { key: "eWallet" as const, entries: breakdown?.eWalletEntries, label: "E-Wallet", Icon: Smartphone, centsKey: "eWalletCents" as const },
          ].map(
            ({ key, entries, label, Icon, centsKey }) =>
              entries?.length ? (
                <div key={key}>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Tick</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount (LKR)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((e, i) => {
                        const tid = `${key}-${i}`
                        const isTicked = ticked.has(tid)
                        return (
                          <TableRow
                            key={tid}
                            className={`transition-colors ${isTicked ? "!bg-emerald-50 dark:!bg-emerald-950/40 hover:!bg-emerald-100 dark:hover:!bg-emerald-900/50" : ""}`}
                          >
                            <TableCell className={isTicked ? "border-l-4 border-l-emerald-500 bg-inherit" : undefined}>
                              <Checkbox checked={isTicked} onCheckedChange={() => toggle(tid)} />
                            </TableCell>
                            <TableCell>{e.reference || "—"}</TableCell>
                            <TableCell className="text-right tabular-nums">{(e.amountCents / 100).toFixed(2)}</TableCell>
                          </TableRow>
                        )
                      })}
                      <TableRow className="border-t-2 font-medium bg-muted/30">
                        <TableCell colSpan={2} />
                        <TableCell className="text-right tabular-nums">
                          LKR {formatCents(handover[centsKey] ?? 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : null
          )}
        </CardContent>
      </Card>
      )}

      {/* Till details: only when pending (after approval, balances have moved so comparison not relevant) */}
      {isPending && tillBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Till balance vs entered</CardTitle>
            <CardDescription>Compare expected till balance by method with what the cashier entered. Resolve any differences before approving.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Till (expected)</TableHead>
                  <TableHead className="text-right">Entered</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {METHOD_KEYS.map((key) => {
                  const expected = tillBreakdown[key] ?? 0
                  const entered = handover[key] ?? 0
                  const diff = entered - expected
                  const isShort = diff < 0
                  const isOver = diff > 0
                  return (
                    <TableRow key={key}>
                      <TableCell>{METHOD_LABELS[key]}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCents(expected)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCents(entered)}</TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${isShort ? "text-destructive font-medium" : isOver ? "text-amber-600 dark:text-amber-400 font-medium" : ""}`}
                      >
                        {diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${formatCents(diff)}`}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Need full receipt-level detail: single CTA to summary report */}
      <Card className="bg-muted/40 print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">Need full receipt-level detail?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {summaryLoading
                  ? "Loading…"
                  : !cashierSummaryFilters
                    ? "Open the cashier summary report for this handover to see all receipts and export."
                    : (() => {
                        const receiptCount = summarySections.reduce((n, s) => n + s.rows.length, 0)
                        const cashierCount = cashierSummaryFilters.userIds.length
                        const chainNote =
                          includedHandovers.length > 0
                            ? ` Covers ${cashierCount} cashier${cashierCount === 1 ? "" : "s"} from earliest shift through handover time (including ${includedHandovers.length} linked handover${includedHandovers.length === 1 ? "" : "s"}).`
                            : cashierCount > 1
                              ? ` Covers ${cashierCount} cashiers from shift start through handover time.`
                              : " Covers this shift from start through handover time."
                        return summarySections.length === 0
                          ? `Open the cashier summary report for full detail and export.${chainNote}`
                          : `This range has ${receiptCount} receipt(s). Open the report for full detail and export.${chainNote}`
                      })()}
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href={cashierSummaryUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4 mr-2" />
                Open cashier summary report
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

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
  )
}
