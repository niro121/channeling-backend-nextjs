"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { submitReconciliationAction, rejectReconciliationAction, getReconciliationJournalsAction } from "@/app/actions/reconciliation.actions"
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
import { CheckCircle2, ChevronDown, CircleAlert, CreditCard, FileText, Landmark, Loader2, BookOpen, Printer, Smartphone, XCircle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ReconciliationPrint } from "./reconciliation-print"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RECONCILIATION_STATUS } from "@/types/handover"

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
    receiptId: string
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
    cannotReconcileAt?: string | null
    cannotReconcileReason?: string | null
  }>
}

export type ReconciliationJournalView = {
  id: string
  journalNumber: number | null
  date: string
  description: string
  lines: {
    accountName: string
    debitAmount: number
    creditAmount: number
    paymentMethod: number | null
  }[]
}

type Props = {
  topLevelHandoverId: string
  chain: HandoverTabData[]
  /** Assigned reconciler (or admin) may submit/reject. */
  canActAsReconciler?: boolean
  reconciliationStatus?: number
  reconciliationRejectReason?: string | null
  handoverNoString?: string | null
  hasReconciliationIssues?: boolean
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

export function ReconciliationDocumentView({
  topLevelHandoverId,
  chain,
  canActAsReconciler = true,
  reconciliationStatus = RECONCILIATION_STATUS.IN_RECONCILIATION,
  reconciliationRejectReason = null,
  handoverNoString = null,
  hasReconciliationIssues = false,
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const { has } = usePermissions()
  const isOpenForAction = reconciliationStatus === RECONCILIATION_STATUS.IN_RECONCILIATION
  const canApproveReconciliation =
    isOpenForAction && has("reconciliation", "approve-reconciliation") && canActAsReconciler

  const [tickedByHandoverId, setTickedByHandoverId] = useState<Record<string, Set<string>>>(() => {
    const o: Record<string, Set<string>> = {}
    for (const tab of chain) {
      const preTicked = new Set<string>()
      for (const r of tab.receipts) {
        if (r.reconciledAt != null && !r.cannotReconcileAt) preTicked.add(r.id)
      }
      o[tab.handover.id] = preTicked
    }
    return o
  })
  const [submitting, setSubmitting] = useState(false)
  const [cannotByHandoverId, setCannotByHandoverId] = useState<Record<string, Record<string, string>>>({})
  const [cannotDialog, setCannotDialog] = useState<{ handoverId: string; receiptId: string } | null>(null)
  const [cannotReason, setCannotReason] = useState("")
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [rejecting, setRejecting] = useState(false)
  const [journalsOpen, setJournalsOpen] = useState(false)
  const [journalsLoading, setJournalsLoading] = useState(false)
  const [journals, setJournals] = useState<ReconciliationJournalView[] | null>(null)
  const [journalsError, setJournalsError] = useState<string | null>(null)

  const hasPostedReceipts = useMemo(
    () => chain.some((tab) => tab.receipts.some((r) => Boolean(r.reconciledAt))),
    [chain]
  )

  const hasBatchToPost = useMemo(() => {
    return chain.some((tab) => {
      const ticked = tickedByHandoverId[tab.handover.id] ?? new Set()
      const cannot = cannotByHandoverId[tab.handover.id] ?? {}
      return tab.receipts.some((r) => {
        if (r.reconciledAt || r.cannotReconcileAt) return false
        return ticked.has(r.id) || Boolean(cannot[r.id])
      })
    })
  }, [chain, tickedByHandoverId, cannotByHandoverId])

  /** Top-level handover (first in chain). */
  const topHandover = chain[0]?.handover

  /** Required amounts summed across ALL handovers in the chain (not just top-level). */
  const requiredByMethod = useMemo(() => {
    const totals = { cardCents: 0, slipCents: 0, checkCents: 0, eWalletCents: 0 }
    for (const { handover } of chain) {
      totals.cardCents += handover.cardCents
      totals.slipCents += handover.slipCents
      totals.checkCents += handover.checkCents
      totals.eWalletCents += handover.eWalletCents
    }
    return totals
  }, [chain])

  type RefEntryWithSource = { reference: string; amountCents: number; from: string }
  type MergedReferences = {
    cardEntries: RefEntryWithSource[]
    slipEntries: RefEntryWithSource[]
    checkEntries: RefEntryWithSource[]
    eWalletEntries: RefEntryWithSource[]
  }

  /** Merged reference entries from all handovers in chain with source user label. */
  const mergedReferences = useMemo((): MergedReferences => {
    const out: MergedReferences = {
      cardEntries: [],
      slipEntries: [],
      checkEntries: [],
      eWalletEntries: [],
    }
    for (const { handover } of chain) {
      const b = handover.enteredBreakdown
      const from = fromUserLabel(handover.fromUser)
      if (b?.cardEntries?.length) out.cardEntries.push(...b.cardEntries.map((e) => ({ ...e, from })))
      if (b?.slipEntries?.length) out.slipEntries.push(...b.slipEntries.map((e) => ({ ...e, from })))
      if (b?.checkEntries?.length) out.checkEntries.push(...b.checkEntries.map((e) => ({ ...e, from })))
      if (b?.eWalletEntries?.length) out.eWalletEntries.push(...b.eWalletEntries.map((e) => ({ ...e, from })))
    }
    return out
  }, [chain])

  /** Posted + currently selected ticked amount per method (can't-reconcile is not deducted). */
  const totalTickedByMethod = useMemo(() => {
    const handledIdsByHandover: Record<string, Set<string>> = {}
    for (const tab of chain) {
      const ticked = tickedByHandoverId[tab.handover.id] ?? new Set()
      const ids = new Set<string>()
      for (const r of tab.receipts) {
        if (r.reconciledAt || ticked.has(r.id)) ids.add(r.id)
      }
      handledIdsByHandover[tab.handover.id] = ids
    }
    const card = chain.reduce((s, tab) => s + netAmount(tab.receipts, handledIdsByHandover[tab.handover.id] ?? new Set(), RECEIPT_PAYMENT_METHOD.CREDIT_CARD), 0)
    const slip = chain.reduce((s, tab) => s + netAmount(tab.receipts, handledIdsByHandover[tab.handover.id] ?? new Set(), RECEIPT_PAYMENT_METHOD.SLIP), 0)
    const check = chain.reduce((s, tab) => s + netAmount(tab.receipts, handledIdsByHandover[tab.handover.id] ?? new Set(), RECEIPT_PAYMENT_METHOD.CHECK), 0)
    const eWallet = chain.reduce((s, tab) => s + netAmount(tab.receipts, handledIdsByHandover[tab.handover.id] ?? new Set(), RECEIPT_PAYMENT_METHOD.E_WALLET), 0)
    return { cardCents: card, slipCents: slip, checkCents: check, eWalletCents: eWallet }
  }, [chain, tickedByHandoverId])

  const toggleReceipt = (handoverId: string, receiptId: string) => {
    setCannotByHandoverId((prev) => {
      if (!prev[handoverId]?.[receiptId]) return prev
      const next = { ...prev[handoverId] }
      delete next[receiptId]
      return { ...prev, [handoverId]: next }
    })
    setTickedByHandoverId((prev) => {
      const set = new Set(prev[handoverId] ?? [])
      if (set.has(receiptId)) set.delete(receiptId)
      else set.add(receiptId)
      return { ...prev, [handoverId]: set }
    })
  }

  const handleSubmit = async () => {
    if (!hasBatchToPost || !canApproveReconciliation) return
    setSubmitting(true)
    try {
      const tickedReceiptIdsByHandoverId: Record<string, string[]> = {}
      const cannotReconcileByHandoverId: Record<string, { id: string; reason: string }[]> = {}
      for (const tab of chain) {
        const ticked = tickedByHandoverId[tab.handover.id] ?? new Set()
        const cannot = cannotByHandoverId[tab.handover.id] ?? {}
        tickedReceiptIdsByHandoverId[tab.handover.id] = tab.receipts
          .filter((r) => !r.reconciledAt && !r.cannotReconcileAt && ticked.has(r.id) && !cannot[r.id])
          .map((r) => r.id)
        cannotReconcileByHandoverId[tab.handover.id] = Object.entries(cannot)
          .filter(([id]) => tab.receipts.some((r) => r.id === id && !r.reconciledAt && !r.cannotReconcileAt))
          .map(([id, reason]) => ({ id, reason }))
      }
      const result = await submitReconciliationAction({
        handoverId: topLevelHandoverId,
        tickedReceiptIdsByHandoverId,
        cannotReconcileByHandoverId,
      })
      if (result.success) {
        if (result.complete) {
          toast({ title: `Posted ${result.postedCount} item(s). Reconciliation complete.` })
          router.push("/reconciliation")
        } else {
          toast({ title: `Posted ${result.postedCount} item(s). ${result.remainingCount} still open.` })
        }
        setJournals(null)
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
    if (hasPostedReceipts) {
      toast({ title: "Cannot reject after a receipt has been posted.", variant: "destructive" })
      return
    }
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

  const openJournals = async () => {
    setJournalsOpen(true)
    setJournalsError(null)
    setJournalsLoading(true)
    try {
      const result = await getReconciliationJournalsAction(topLevelHandoverId)
      if (!result.success) {
        setJournalsError(result.error ?? "Failed to load journals.")
        setJournals([])
        return
      }
      setJournals(
        result.journals.map((j) => ({
          ...j,
          date: j.date instanceof Date ? j.date.toISOString() : String(j.date),
        }))
      )
    } catch {
      setJournalsError("Failed to load journals.")
      setJournals([])
    } finally {
      setJournalsLoading(false)
    }
  }

  const printReconciliation = (mode: "summary" | "report") => {
    const styleId = "reconciliation-print-page-size"
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
    document.body.classList.add("print-reconciliation")
    const cleanup = () => {
      document.body.classList.remove("print-reconciliation")
      el?.remove()
    }
    window.addEventListener("afterprint", cleanup, { once: true })
    window.print()
  }

  return (
    <>
    <div className="reconciliation-screen flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
          Reconcile handover{handoverNoString ? <span className="font-mono"> {handoverNoString}</span> : null}
          {hasReconciliationIssues ? <Badge variant="destructive">Issues</Badge> : null}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openJournals}>
            <BookOpen className="h-4 w-4 mr-1" />
            Double entries
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Printer className="h-4 w-4 mr-1" />
                Print
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => printReconciliation("summary")}>
                A6 (Default)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => printReconciliation("report")}>
                A4
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <BackButton href="/reconciliation" />
        </div>
      </div>
      {reconciliationStatus === RECONCILIATION_STATUS.RECONCILED_REJECTED ? (
        <Alert className="border-red-500/50 bg-red-50 dark:bg-red-950/30 dark:border-red-500/40">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>Reconciliation rejected</AlertTitle>
          <AlertDescription>
            {reconciliationRejectReason
              ? <>Reason: <strong>{reconciliationRejectReason}</strong>. This document is read-only until the bulk cashier sends it again.</>
              : "This document is read-only until the bulk cashier sends it again."}
          </AlertDescription>
        </Alert>
      ) : reconciliationStatus === RECONCILIATION_STATUS.RECONCILED_APPROVED ? (
        <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/30 dark:border-green-500/40">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Already reconciled</AlertTitle>
          <AlertDescription>This handover has been submitted as reconciled. The document is read-only.</AlertDescription>
        </Alert>
      ) : (
        <p className="text-sm text-muted-foreground">
          Post in batches. Only ticked receipts are deducted from the cashier till. Mark leftover lines as can&apos;t reconcile (they stay on the till) so the document can close.
        </p>
      )}

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
                        {idx === 0 ? "Top level" : `Previous: ${fromUserLabel(tab.handover.fromUser)}`}
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
                    const requiredCents = requiredByMethod[key]
                    const tickedCents = totalTickedByMethod[key]
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
                  const requiredCents = requiredByMethod[key]
                  const tickedCents = totalTickedByMethod[key]
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
                        <span className="text-muted-foreground">Posted / selected:</span>
                        <span className="font-semibold tabular-nums">{formatCents(tickedCents)}</span>
                        <span className={cn("ml-auto flex items-center gap-1 font-medium", methodOk ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
                          {methodOk ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                          {methodOk ? "Match" : "Post remaining receipts below"}
                        </span>
                      </div>

                      {/* References grouped by source user, top-level shift first */}
                      {handoverEntries.length > 0 && (() => {
                        const grouped: { from: string; entries: typeof handoverEntries }[] = []
                        for (const entry of handoverEntries) {
                          const last = grouped[grouped.length - 1]
                          if (last && last.from === entry.from) {
                            last.entries.push(entry)
                          } else {
                            grouped.push({ from: entry.from, entries: [entry] })
                          }
                        }
                        return (
                          <div className="rounded-md border bg-muted/30 px-3 py-2.5 space-y-3">
                            <p className="text-xs font-medium text-muted-foreground">Handover references (to match)</p>
                            {grouped.map((group, gi) => {
                              const isTopLevel = gi === 0
                              return (
                                <div key={gi} className={cn(
                                  "rounded-md px-2.5 py-2",
                                  isTopLevel
                                    ? "border-2 border-primary/40 bg-primary/5 dark:bg-primary/10"
                                    : "border border-border/50 bg-transparent"
                                )}>
                                  <p className={cn(
                                    "mb-1 font-semibold",
                                    isTopLevel ? "text-xs text-primary" : "text-[11px] text-muted-foreground"
                                  )}>
                                    {group.from}{isTopLevel ? " — Top Level" : ""}
                                  </p>
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="hover:bg-transparent border-0">
                                        <TableHead className="h-6 py-0 text-xs font-medium">Reference</TableHead>
                                        <TableHead className="h-6 py-0 text-right text-xs font-medium">Amount</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.entries.map((entry, i) => (
                                        <TableRow key={i} className="hover:bg-transparent border-0">
                                          <TableCell className="py-0.5 font-mono text-xs">{entry.reference || "—"}</TableCell>
                                          <TableCell className="py-0.5 text-right text-xs tabular-nums">{formatCents(entry.amountCents)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}

                      {/* Single table: all receipts for this method */}
                      <div className="rounded-md border">
                        <p className="px-3 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/20">
                          Tick matched receipts to deduct from till. Mark leftover as can&apos;t reconcile to close the document without deducting.
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
                              <TableHead className="py-2 text-xs text-left">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allReceiptsThisMethod.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-muted-foreground text-center py-4 text-sm">
                                  No {methodLabel} receipts
                                </TableCell>
                              </TableRow>
                            ) : (
                              allReceiptsThisMethod.map(({ tab, r }) => {
                                const ticked = tickedByHandoverId[tab.handover.id] ?? new Set()
                                const pendingCannot = cannotByHandoverId[tab.handover.id]?.[r.id]
                                const postedCannot = Boolean(r.cannotReconcileAt)
                                const postedReconciled = Boolean(r.reconciledAt) && !postedCannot
                                const locked = postedReconciled || postedCannot || !isOpenForAction
                                const shiftLabel = tab.handover.shift?.startedAt
                                  ? `${fromUserLabel(tab.handover.fromUser)} · ${formatDateTimeWithSeconds(tab.handover.shift.startedAt)}`
                                  : fromUserLabel(tab.handover.fromUser)
                                return (
                                  <TableRow key={r.id} className={cn(postedCannot || pendingCannot ? "bg-amber-50/60 dark:bg-amber-950/20" : postedReconciled ? "bg-green-50/50 dark:bg-green-950/20" : "")}>
                                    <TableCell className="py-1.5">
                                      <Checkbox
                                        checked={postedReconciled || (!postedCannot && ticked.has(r.id))}
                                        disabled={locked || postedCannot || Boolean(pendingCannot)}
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
                                    <TableCell className="py-1.5 text-xs text-left align-top min-w-[10rem]">
                                      {postedCannot ? (
                                        <div className="text-left">
                                          <p className="font-medium text-red-700 dark:text-red-400">Can&apos;t reconcile</p>
                                          {r.cannotReconcileReason ? (
                                            <p className="mt-0.5 text-[11px] text-muted-foreground whitespace-normal">{r.cannotReconcileReason}</p>
                                          ) : null}
                                        </div>
                                      ) : postedReconciled ? (
                                        <p className="font-medium text-green-700 dark:text-green-400">Posted</p>
                                      ) : pendingCannot ? (
                                        <div className="text-left">
                                          <p className="font-medium text-red-700 dark:text-red-400">Can&apos;t reconcile</p>
                                          <p className="mt-0.5 text-[11px] text-muted-foreground whitespace-normal">{pendingCannot}</p>
                                          {isOpenForAction && (
                                            <Button
                                              variant="link"
                                              size="sm"
                                              className="h-auto px-0 mt-1 text-xs"
                                              onClick={() => {
                                                setCannotByHandoverId((prev) => {
                                                  const next = { ...(prev[tab.handover.id] ?? {}) }
                                                  delete next[r.id]
                                                  return { ...prev, [tab.handover.id]: next }
                                                })
                                              }}
                                            >
                                              Undo
                                            </Button>
                                          )}
                                        </div>
                                      ) : ticked.has(r.id) ? (
                                        <p className="font-medium text-green-700 dark:text-green-400">Ticked</p>
                                      ) : isOpenForAction ? (
                                        <Button
                                          variant="link"
                                          size="sm"
                                          className="h-auto px-0 text-xs font-medium text-red-700 dark:text-red-400"
                                          onClick={() => {
                                            setTickedByHandoverId((prev) => {
                                              const set = new Set(prev[tab.handover.id] ?? [])
                                              set.delete(r.id)
                                              return { ...prev, [tab.handover.id]: set }
                                            })
                                            setCannotReason("")
                                            setCannotDialog({ handoverId: tab.handover.id, receiptId: r.id })
                                          }}
                                        >
                                          Can&apos;t reconcile
                                        </Button>
                                      ) : (
                                        <span className="text-muted-foreground">Open</span>
                                      )}
                                    </TableCell>
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

      <Dialog open={journalsOpen} onOpenChange={setJournalsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Double entries (journals)</DialogTitle>
            <DialogDescription>
              Each post credits the cashier till and debits the branch Reconciled account.
            </DialogDescription>
          </DialogHeader>
          {journalsLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading journals…
            </div>
          ) : journalsError ? (
            <p className="text-sm text-destructive py-4">{journalsError}</p>
          ) : !journals || journals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No journals posted yet for this handover.</p>
          ) : (
            <div className="space-y-4">
              {journals.map((j) => (
                <div key={j.id} className="rounded-md border overflow-x-auto">
                  <div className="px-3 py-2 border-b bg-muted/20 text-xs">
                    <span className="font-medium">
                      {j.journalNumber != null ? `Journal #${j.journalNumber}` : "Journal"}
                    </span>
                    <span className="text-muted-foreground"> · {formatDateTimeWithSeconds(j.date)}</span>
                    <p className="mt-1 text-muted-foreground">{j.description}</p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Account</TableHead>
                        <TableHead className="text-xs">Method</TableHead>
                        <TableHead className="text-right text-xs">Debit</TableHead>
                        <TableHead className="text-right text-xs">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {j.lines.map((line, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{line.accountName}</TableCell>
                          <TableCell className="text-xs">
                            {line.paymentMethod != null ? (PAYMENT_METHOD_NAMES[line.paymentMethod] ?? `Method ${line.paymentMethod}`) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {line.debitAmount > 0 ? formatCents(line.debitAmount) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {line.creditAmount > 0 ? formatCents(line.creditAmount) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={cannotDialog != null}
        onOpenChange={(open) => {
          if (!open) {
            setCannotDialog(null)
            setCannotReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Can&apos;t reconcile</DialogTitle>
            <DialogDescription>
              This does not deduct from the cashier till. The receipt is marked can&apos;t reconcile so leftover lines can be closed. A reason is required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="cannot-reason">Reason (required)</Label>
            <Textarea
              id="cannot-reason"
              placeholder="e.g. Bank slip missing / reference does not match"
              value={cannotReason}
              onChange={(e) => setCannotReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCannotDialog(null)
                setCannotReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!cannotDialog || !cannotReason.trim()) return
                setCannotByHandoverId((prev) => ({
                  ...prev,
                  [cannotDialog.handoverId]: {
                    ...(prev[cannotDialog.handoverId] ?? {}),
                    [cannotDialog.receiptId]: cannotReason.trim(),
                  },
                }))
                setCannotDialog(null)
                setCannotReason("")
              }}
              disabled={!cannotReason.trim()}
            >
              Mark can&apos;t reconcile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/reconciliation">Cancel</Link>
        </Button>
        {canApproveReconciliation && (
          <>
            {!hasPostedReceipts && (
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
            )}
            <Button
              onClick={handleSubmit}
              disabled={!hasBatchToPost || submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Post selected
            </Button>
          </>
        )}
        {!canApproveReconciliation && isOpenForAction && (
          <span className="text-sm text-muted-foreground">
            {canActAsReconciler
              ? "You do not have permission to approve or reject reconciliation."
              : "Only the assigned reconciler can submit or reject this handover."}
          </span>
        )}
      </div>
    </div>
    <ReconciliationPrint
      topLevelHandoverId={topLevelHandoverId}
      handoverNoString={handoverNoString}
      reconciliationStatus={reconciliationStatus}
      hasReconciliationIssues={hasReconciliationIssues}
      chain={chain}
      tickedByHandoverId={tickedByHandoverId}
      cannotByHandoverId={cannotByHandoverId}
    />
    </>
  )
}
