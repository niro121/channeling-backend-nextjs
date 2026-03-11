"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { getHandoverDetailAction, approveHandoverAction, rejectHandoverAction } from "@/app/actions/shift.actions"
import { getCashierSummaryReportData } from "@/app/actions/reports/cashier-summary.action"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/hooks/use-toast"
import { formatCents } from "@/lib/format-money"
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
} from "lucide-react"
import { BackButton } from "@/components/common/back-button"

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

function fromUserLabel(fromUser: { name: string | null; staff?: { code: string } | null } | null | undefined): string {
  if (!fromUser) return "—"
  const name = fromUser.name ?? "—"
  return fromUser.staff?.code ? `${name} (${fromUser.staff.code})` : name
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
  const [summarySections, setSummarySections] = useState<CashierSummaryReportSection[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)
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
    if (!data) return
    const handover = data.handover
    const shift = handover.shift
    const from = shift?.startedAt ? new Date(shift.startedAt).toISOString().slice(0, 16) : ""
    const to = handover.createdAt ? new Date(handover.createdAt).toISOString().slice(0, 16) : ""
    if (!from || !to || !handover.fromUserId) return
    setSummaryLoading(true)
    getCashierSummaryReportData({
      userId: handover.fromUserId,
      dateFrom: from,
      dateTo: to,
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
      toast({ title: "Handover approved and received. Funds recorded to your till; shift ended." })
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

  const cashierSummaryUrl = handover.shift?.startedAt && handover.createdAt
    ? `/reports/cashier-summary?userId=${encodeURIComponent(handover.fromUserId)}&dateFrom=${encodeURIComponent(new Date(handover.shift.startedAt).toISOString().slice(0, 16))}&dateTo=${encodeURIComponent(new Date(handover.createdAt).toISOString().slice(0, 16))}`
    : "/reports/cashier-summary"

  const hasIssues = tillBreakdown && METHOD_KEYS.some((key) => (tillBreakdown[key] ?? 0) !== (handover[key] ?? 0))
  const tickProgress = allTickIds.length > 0 ? `${ticked.size} of ${allTickIds.length} checked` : null

  return (
    <div className="space-y-6">
      {/* Page header with actions — sticky so Reject/Approve stay visible when scrolling */}
      <div className="sticky top-14 z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-3 bg-background border-b border-border">
        <BackButton href="/handovers" />
        <div className="flex gap-2">
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
        </div>
      </div>

      {/* Who & how much: clear at a glance */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Handover from</p>
              <p className="text-xl font-semibold mt-0.5">{fromUserLabel(handover.fromUser)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Shift: {handover.shift?.startedAt ? new Date(handover.shift.startedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"}
                {" → "}
                Handover at {handover.createdAt ? new Date(handover.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"}
              </p>
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

      {/* Issues: only when there are differences or a reason */}
      {(hasIssues || handover.discrepancyReason) && (
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

      {/* Entries to check: tick when verified */}
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

      {/* Till details: expected vs entered (compact reference) */}
      {tillBreakdown && (
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
      <Card className="bg-muted/40">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">Need full receipt-level detail?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {summaryLoading
                  ? "Loading…"
                  : summarySections.length === 0
                    ? "Open the cashier summary report for this shift to see all receipts and export."
                    : `This shift has ${summarySections.reduce((n, s) => n + s.rows.length, 0)} receipt(s). Open the report for full detail and export.`}
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
                Funds will be recorded to your till and a journal entry created. You can add optional comments (e.g. notes for records).
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
