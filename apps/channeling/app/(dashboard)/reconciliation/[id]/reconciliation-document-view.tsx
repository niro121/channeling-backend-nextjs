"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { usePermissions } from "@/components/hooks/use-permissions"
import { formatCents, formatReceiptAmount, receiptAmountToCents } from "@/lib/format-money"
import { PAYMENT_METHOD_NAMES, RECEIPT_PAYMENT_METHOD } from "@/types/receipt"
import { submitReconciliationAction, rejectReconciliationAction } from "@/app/actions/reconciliation.actions"
import { BackButton } from "@/components/common/back-button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, CircleAlert, CreditCard, FileText, Landmark, Loader2, Smartphone, XCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

/** Date/time with AM/PM and seconds for display. */
function formatDateTimeWithSeconds(d: Date | string): string {
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
}

/** Handover-level entries (reference + amount) entered by cashier at handover */
export type HandoverEnteredEntries = {
  cardEntries?: { reference: string; amountCents: number }[]
  slipEntries?: { reference: string; amountCents: number }[]
  checkEntries?: { reference: string; amountCents: number }[]
  eWalletEntries?: { reference: string; amountCents: number }[]
}

export type HandoverTabData = {
  handover: {
    id: string
    fromUser: { id: string; name: string | null; staff: { code: string } | null }
    shift: { id: string; startedAt: string; userId: string }
    cardCents: number
    slipCents: number
    checkCents: number
    eWalletCents: number
    createdAt: string
    /** Cashier-entered references at handover (cardEntries, slipEntries, etc.) */
    enteredBreakdown?: HandoverEnteredEntries | null
  }
  receipts: Array<{
    id: string
    receiptNoString: string
    paymentMethod: number
    amount: number
    type: number
    createdAt: string
    cardReference: string
    slipReference: string
    /** YYYY-MM-DD when set */
    slipDate: string | null
    /** When set, receipt was already reconciled for this handover; UI shows it pre-ticked. */
    reconciledAt?: string | null
    reconciledBy?: string | null
  }>
}

type Props = {
  topLevelHandoverId: string
  chain: HandoverTabData[]
  /** Assigned reconciler (or admin) may submit/reject. */
  canActAsReconciler?: boolean
}

/** Net amount in cents for comparison with handover cardCents/slipCents etc. */
function netAmount(
  receipts: HandoverTabData["receipts"],
  tickedIds: Set<string>,
  method: number
): number {
  return receipts
    .filter((r) => r.paymentMethod === method && tickedIds.has(r.id))
    .reduce((sum, r) => sum + (r.type === 1 ? receiptAmountToCents(r.amount) : -receiptAmountToCents(r.amount)), 0)
}

function fromUserLabel(fromUser: HandoverTabData["handover"]["fromUser"]): string {
  if (!fromUser) return "—"
  const name = fromUser.name ?? "—"
  return fromUser.staff?.code ? `${name} (${fromUser.staff.code})` : name
}

function formatReceiptReference(r: HandoverTabData["receipts"][number]): string {
  if (r.cardReference?.trim()) return r.cardReference.trim()
  const slipRef = r.slipReference?.trim()
  if (!slipRef) return "—"
  const slipDate = r.slipDate?.trim()
  return slipDate ? `${slipRef} · ${slipDate}` : slipRef
}

const NON_CASH_METHODS_ORDERED: {
  method: number
  key: "cardCents" | "slipCents" | "checkCents" | "eWalletCents"
  entriesKey: keyof HandoverEnteredEntries
  Icon: React.ComponentType<{ className?: string }>
}[] = [
  { method: RECEIPT_PAYMENT_METHOD.CREDIT_CARD, key: "cardCents", entriesKey: "cardEntries", Icon: CreditCard },
  { method: RECEIPT_PAYMENT_METHOD.SLIP, key: "slipCents", entriesKey: "slipEntries", Icon: FileText },
  { method: RECEIPT_PAYMENT_METHOD.CHECK, key: "checkCents", entriesKey: "checkEntries", Icon: Landmark },
  { method: RECEIPT_PAYMENT_METHOD.E_WALLET, key: "eWalletCents", entriesKey: "eWalletEntries", Icon: Smartphone },
]

export function ReconciliationDocumentView({ topLevelHandoverId, chain, canActAsReconciler = true }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const { has } = usePermissions()
  const canApproveReconciliation = has("reconciliation", "approve-reconciliation") && canActAsReconciler

  const [tickedByHandoverId, setTickedByHandoverId] = useState<Record<string, Set<string>>>(() => {
    const o: Record<string, Set<string>> = {}
    for (const tab of chain) {
      const preTicked = new Set<string>()
      for (const r of tab.receipts) {
        if (r.reconciledAt != null || r.reconciledBy != null) preTicked.add(r.id)
      }
      o[tab.handover.id] = preTicked
    }
    return o
  })
  const [submitting, setSubmitting] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [rejecting, setRejecting] = useState(false)

  const hasAnyTickedReceipt = useMemo(() => {
    return chain.some((tab) => (tickedByHandoverId[tab.handover.id] ?? new Set()).size > 0)
  }, [chain, tickedByHandoverId])

  /** Top-level handover (first in chain); required amounts and merged refs compare against this. */
  const topHandover = chain[0]?.handover

  /** Merged reference entries from all handovers in chain (order preserved). */
  const mergedReferences = useMemo((): HandoverEnteredEntries => {
    const out: HandoverEnteredEntries = {
      cardEntries: [],
      slipEntries: [],
      checkEntries: [],
      eWalletEntries: [],
    }
    for (const { handover } of chain) {
      const b = handover.enteredBreakdown
      if (b?.cardEntries?.length) out.cardEntries!.push(...b.cardEntries)
      if (b?.slipEntries?.length) out.slipEntries!.push(...b.slipEntries)
      if (b?.checkEntries?.length) out.checkEntries!.push(...b.checkEntries)
      if (b?.eWalletEntries?.length) out.eWalletEntries!.push(...b.eWalletEntries)
    }
    return out
  }, [chain])

  /** Total ticked amount per method across all handovers (for comparison with top-level required). */
  const totalTickedByMethod = useMemo(() => {
    const card = chain.reduce((s, tab) => s + netAmount(tab.receipts, tickedByHandoverId[tab.handover.id] ?? new Set(), RECEIPT_PAYMENT_METHOD.CREDIT_CARD), 0)
    const slip = chain.reduce((s, tab) => s + netAmount(tab.receipts, tickedByHandoverId[tab.handover.id] ?? new Set(), RECEIPT_PAYMENT_METHOD.SLIP), 0)
    const check = chain.reduce((s, tab) => s + netAmount(tab.receipts, tickedByHandoverId[tab.handover.id] ?? new Set(), RECEIPT_PAYMENT_METHOD.CHECK), 0)
    const eWallet = chain.reduce((s, tab) => s + netAmount(tab.receipts, tickedByHandoverId[tab.handover.id] ?? new Set(), RECEIPT_PAYMENT_METHOD.E_WALLET), 0)
    return { cardCents: card, slipCents: slip, checkCents: check, eWalletCents: eWallet }
  }, [chain, tickedByHandoverId])

  const toggleReceipt = (handoverId: string, receiptId: string) => {
    setTickedByHandoverId((prev) => {
      const set = new Set(prev[handoverId] ?? [])
      if (set.has(receiptId)) set.delete(receiptId)
      else set.add(receiptId)
      return { ...prev, [handoverId]: set }
    })
  }

  const handleSubmit = async () => {
    if (!hasAnyTickedReceipt || !canApproveReconciliation) return
    setSubmitting(true)
    try {
      const tickedReceiptIdsByHandoverId: Record<string, string[]> = {}
      for (const [handoverId, set] of Object.entries(tickedByHandoverId)) {
        tickedReceiptIdsByHandoverId[handoverId] = Array.from(set)
      }
      const result = await submitReconciliationAction({
        handoverId: topLevelHandoverId,
        tickedReceiptIdsByHandoverId,
      })
      if (result.success) {
        toast({ title: "Reconciliation submitted successfully." })
        router.push("/reconciliation")
        router.refresh()
      } else {
        toast({ title: result.error ?? "Submit failed", variant: "destructive" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    const reason = rejectReason.trim()
    if (!reason) {
      toast({ title: "Please enter a rejection reason.", variant: "destructive" })
      return
    }
    if (!canApproveReconciliation) return
    setRejecting(true)
    try {
      const result = await rejectReconciliationAction(topLevelHandoverId, reason)
      if (result.success) {
        toast({ title: "Reconciliation rejected." })
        setRejectOpen(false)
        setRejectReason("")
        router.push("/reconciliation")
        router.refresh()
      } else {
        toast({ title: result.error ?? "Reject failed", variant: "destructive" })
      }
    } finally {
      setRejecting(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Reconcile handover</h2>
        <BackButton href="/reconciliation" />
      </div>
      <p className="text-sm text-muted-foreground">
        Tick the receipts you have verified. Only ticked amounts are transferred from till to the reconciled account. Submit when ready.
      </p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Handover documents summary</CardTitle>
          {chain.length > 1 && (
            <p className="text-sm text-muted-foreground font-normal mt-1">
              Top-level handover and {chain.length - 1} linked (previous) handover{chain.length - 1 !== 1 ? "s" : ""}.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">#</TableHead>
                  <TableHead className="whitespace-nowrap">Handover</TableHead>
                  <TableHead className="whitespace-nowrap">From</TableHead>
                  <TableHead className="whitespace-nowrap">Shift</TableHead>
                  <TableHead className="whitespace-nowrap">Handover date</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Card</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Slip</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Check</TableHead>
                  <TableHead className="text-right whitespace-nowrap">E-Wallet</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Receipts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chain.map((tab, idx) => {
                  const shiftStartedAt = tab.handover.shift?.startedAt
                    ? formatDateTimeWithSeconds(tab.handover.shift.startedAt)
                    : "—"
                  const handoverDate = tab.handover.createdAt
                    ? formatDateTimeWithSeconds(tab.handover.createdAt)
                    : "—"
                  return (
                    <TableRow key={tab.handover.id}>
                      <TableCell className="tabular-nums text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {idx === 0 ? "Top level" : `Linked: ${fromUserLabel(tab.handover.fromUser)}`}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{fromUserLabel(tab.handover.fromUser)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{shiftStartedAt}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{handoverDate}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCents(tab.handover.cardCents)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCents(tab.handover.slipCents)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCents(tab.handover.checkCents)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCents(tab.handover.eWalletCents)}</TableCell>
                      <TableCell className="text-right tabular-nums">{tab.receipts.length}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Method-wise tabs: one tab per payment method (including 0); each tab shows only that method's references and receipts. */}
      {topHandover && (() => {
        const methodTabs = NON_CASH_METHODS_ORDERED
        const defaultTab = methodTabs[0]?.key ?? "cardCents"
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">References (all handovers) — compare with ticked receipts</CardTitle>
              <p className="text-sm text-muted-foreground font-normal mt-1">
                Switch by method; only that method&apos;s receipts are shown in the list below.
              </p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-1 p-1">
                  {methodTabs.map(({ method, key, entriesKey, Icon }) => {
                    const requiredCents = topHandover[key]
                    const tickedCents =
                      key === "cardCents"
                        ? totalTickedByMethod.cardCents
                        : key === "slipCents"
                          ? totalTickedByMethod.slipCents
                          : key === "checkCents"
                            ? totalTickedByMethod.checkCents
                            : totalTickedByMethod.eWalletCents
                    const methodOk = tickedCents === requiredCents
                    const methodLabel = PAYMENT_METHOD_NAMES[method] ?? `Method ${method}`
                    return (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className={cn(
                          "gap-1.5 text-xs sm:text-sm",
                          methodOk &&
                            "border-emerald-500/60 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-500/50 data-[state=active]:border-emerald-500 data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30",
                          !methodOk &&
                            "border-amber-500/70 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-500/50 data-[state=active]:border-amber-500 data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{methodLabel}</span>
                        {methodOk ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Reconciled" />
                        ) : (
                          <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-label="No match" />
                        )}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
                {methodTabs.map(({ method, key, entriesKey, Icon }) => {
                  const requiredCents = topHandover[key]
                  const tickedCents =
                    key === "cardCents"
                      ? totalTickedByMethod.cardCents
                      : key === "slipCents"
                        ? totalTickedByMethod.slipCents
                        : key === "checkCents"
                          ? totalTickedByMethod.checkCents
                          : totalTickedByMethod.eWalletCents
                  const methodOk = tickedCents === requiredCents
                  const methodLabel = PAYMENT_METHOD_NAMES[method] ?? `Method ${method}`
                  const handoverEntries = mergedReferences[entriesKey] ?? []
                  const allReceiptsThisMethod: { tab: HandoverTabData; r: (typeof chain)[0]["receipts"][0] }[] = []
                  chain.forEach((tab) => {
                    tab.receipts
                      .filter((r) => r.paymentMethod === method)
                      .forEach((r) => allReceiptsThisMethod.push({ tab, r }))
                  })
                  return (
                    <TabsContent key={key} value={key} className="mt-4 space-y-4">
                      {/* Compact summary: what to do + status */}
                      <div
                        className={cn(
                          "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border px-3 py-2 text-sm",
                          methodOk
                            ? "border-green-500/50 bg-green-50 dark:bg-green-950/30 dark:border-green-500/40"
                            : "border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-500/40"
                        )}
                      >
                        <span className="text-muted-foreground">Target:</span>
                        <span className="font-semibold tabular-nums">{formatCents(requiredCents)}</span>
                        <span className="text-muted-foreground">Ticked:</span>
                        <span className="font-semibold tabular-nums">{formatCents(tickedCents)}</span>
                        <span className={cn("ml-auto flex items-center gap-1 font-medium", methodOk ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
                          {methodOk ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                          {methodOk ? "Match" : "Tick receipts below to match target"}
                        </span>
                      </div>

                      {/* References: separate compact block */}
                      {handoverEntries.length > 0 && (
                        <div className="rounded-md border bg-muted/30 px-3 py-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Handover references (to match)</p>
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent border-0">
                                <TableHead className="h-7 py-0 text-xs font-medium">Reference</TableHead>
                                <TableHead className="h-7 py-0 text-right text-xs font-medium">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {handoverEntries.map((entry, i) => (
                                <TableRow key={i} className="hover:bg-transparent border-0">
                                  <TableCell className="py-0.5 font-mono text-xs">{entry.reference || "—"}</TableCell>
                                  <TableCell className="py-0.5 text-right text-xs tabular-nums">{formatCents(entry.amountCents)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Single table: all receipts for this method */}
                      <div className="rounded-md border">
                        <p className="px-3 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/20">
                          Tick receipts so total equals target above
                        </p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10 py-2">Tick</TableHead>
                              <TableHead className="py-2 text-xs">Shift</TableHead>
                              <TableHead className="py-2 text-xs">Receipt #</TableHead>
                              <TableHead className="py-2 text-xs">Date</TableHead>
                              <TableHead className="py-2 text-right text-xs">Amount</TableHead>
                              <TableHead className="py-2 text-xs">Reference</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allReceiptsThisMethod.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-muted-foreground text-center py-4 text-sm">
                                  No {methodLabel} receipts
                                </TableCell>
                              </TableRow>
                            ) : (
                              allReceiptsThisMethod.map(({ tab, r }) => {
                                const ticked = tickedByHandoverId[tab.handover.id] ?? new Set()
                                const shiftLabel = tab.handover.shift?.startedAt
                                  ? `${fromUserLabel(tab.handover.fromUser)} · ${formatDateTimeWithSeconds(tab.handover.shift.startedAt)}`
                                  : fromUserLabel(tab.handover.fromUser)
                                return (
                                  <TableRow key={r.id}>
                                    <TableCell className="py-1.5">
                                      <Checkbox
                                        checked={ticked.has(r.id)}
                                        onCheckedChange={() => toggleReceipt(tab.handover.id, r.id)}
                                      />
                                    </TableCell>
                                    <TableCell className="py-1.5 text-xs text-muted-foreground whitespace-nowrap">{shiftLabel}</TableCell>
                                    <TableCell className="py-1.5 font-mono text-xs">{r.receiptNoString}</TableCell>
                                    <TableCell className="py-1.5 text-xs whitespace-nowrap">
                                      {formatDateTimeWithSeconds(r.createdAt)}
                                    </TableCell>
                                    <TableCell className="py-1.5 text-right text-xs tabular-nums">
                                      {r.type === 1 ? "" : "−"} {formatReceiptAmount(r.amount)}
                                    </TableCell>
                                    <TableCell className="py-1.5 text-xs">{formatReceiptReference(r)}</TableCell>
                                  </TableRow>
                                )
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  )
                })}
              </Tabs>
            </CardContent>
          </Card>
        )
      })()}

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/reconciliation">Cancel</Link>
        </Button>
        {canApproveReconciliation && (
          <>
            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" type="button" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject reconciliation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject reconciliation</DialogTitle>
                  <DialogDescription>
                    This will mark the handover as reconciliation rejected. A reason is required.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-2">
                  <Label htmlFor="reject-reason">Reason (required)</Label>
                  <Textarea
                    id="reject-reason"
                    placeholder="e.g. Receipts do not match; missing slips"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={rejecting}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleReject} disabled={rejecting || !rejectReason.trim()}>
                    {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Reject
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              onClick={handleSubmit}
              disabled={!hasAnyTickedReceipt || submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit as reconciled
            </Button>
          </>
        )}
        {!canApproveReconciliation && (
          <span className="text-sm text-muted-foreground">
            {canActAsReconciler
              ? "You do not have permission to approve or reject reconciliation."
              : "Only the assigned reconciler can submit or reject this handover."}
          </span>
        )}
      </div>
    </div>
  )
}
