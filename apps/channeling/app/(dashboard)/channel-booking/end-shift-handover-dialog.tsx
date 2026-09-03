"use client"

import { useState, useEffect, useCallback, useId, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SearchableUserSelect } from "@/components/common/user-select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getMyTillBalance } from "@/app/actions/till.actions"
import { getBulkCashierUsersAction } from "@/app/actions/float-request.actions"
import {
  submitShiftHandoverAction,
  getHandoversReceivedByShiftAction,
  getHandoversToMeAction,
  getPendingIncomingHandoverCountAction,
  getOpenFloatsBlockingShiftEndAction,
  getOpenApprovalRequestsBlockingShiftEndAction,
  getIncludableHandoversForSenderAction,
  getLinkedHandoversForShiftAction,
  getNonCashHeldInReconciliationAction,
  canEndShiftWithoutHandoverAction,
  endShiftAction,
} from "@/app/actions/shift.actions"
import Link from "next/link"
import { useToast } from "@/components/hooks/use-toast"
import {
  Loader2,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  Banknote,
  CreditCard,
  FileText,
  Receipt,
  Wallet,
  Smartphone,
  CircleAlert,
  CheckCircle2,
  Camera,
  ZoomIn,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { listMyShiftBillAttachmentsAction } from "@/app/actions/shift-bill-attachment.actions"
import type { ShiftBillAttachmentDto } from "@/types/shift-bill-attachment"
import { SHIFT_BILL_KIND_LABELS, shiftBillUploaderTag } from "@/types/shift-bill-attachment"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { formatCents } from "@/lib/format-money"
import {
  formatHandoverOverAmountError,
  getHandoverAmountOvers,
} from "@/lib/handover-utils"
import { cn } from "@/lib/utils"
import type { MyTillBalance } from "@/app/actions/till.actions"
import {
  LKR_DENOMINATIONS_CENTS,
  formatDenomLabel,
  lkrToCents,
  denominationsTotalLKR,
  type DenominationEntry,
} from "@/types/float-request"

/** Notes: 10 LKR and above. */
const CASH_NOTES = [5000, 2000, 1000, 500, 100, 50, 20, 10]
/** Coins: below 10 LKR (5, 2, 1 rupee coins + small change). */
const CASH_COINS = [5, 2, 1, ...LKR_DENOMINATIONS_CENTS]
const CASH_ALL_DENOMS = [...CASH_NOTES, ...CASH_COINS]

const METHOD_KEYS = ["cashCents", "cardCents", "slipCents", "checkCents", "creditCents", "eWalletCents"] as const
const METHOD_LABELS: Record<(typeof METHOD_KEYS)[number], string> = {
  cashCents: "Cash",
  cardCents: "Credit card slips",
  slipCents: "Slips",
  checkCents: "Cheques",
  creditCents: "Credit",
  eWalletCents: "E-Wallet",
}

/** Tab value and icon for each payment method in step 2. */
const METHOD_TABS: { key: (typeof METHOD_KEYS)[number]; value: string; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "cashCents", value: "cash", label: "Cash", Icon: Banknote },
  { key: "cardCents", value: "card", label: "Card", Icon: CreditCard },
  { key: "slipCents", value: "slips", label: "Slips", Icon: FileText },
  { key: "checkCents", value: "cheques", label: "Cheques", Icon: Receipt },
  { key: "creditCents", value: "credit", label: "Credit", Icon: Wallet },
  { key: "eWalletCents", value: "eWallet", label: "E-Wallet", Icon: Smartphone },
]

/** Non-cash: one row is reference + amount (LKR string). */
type MethodEntry = { id: string; reference: string; amount: string }

function centsFromLkrString(value: string): number {
  const parsed = parseFloat(value)
  if (Number.isNaN(parsed) || parsed < 0) return 0
  return Math.round(parsed * 100)
}

function matchDenom(a: number, b: number) {
  return a >= 1 && b >= 1 ? a === b : Math.abs(a - b) < 1e-6
}

function handoverDiffLabel(enteredCents: number, availableCents: number): string {
  const diff = availableCents - enteredCents
  if (diff === 0) return "difference: 0.00"
  if (diff > 0) return `difference: Short ${formatCents(diff)}`
  return `difference: Over ${formatCents(Math.abs(diff))}`
}

function HandoverTabAmountSummary({
  label,
  enteredCents,
  availableCents,
  availableSuffix,
}: {
  label: string
  enteredCents: number
  availableCents: number
  availableSuffix?: string
}) {
  const mismatch = enteredCents !== availableCents
  const availableText = availableSuffix
    ? `available to hand over ${availableSuffix}`
    : "available to hand over"
  return (
    <p className="text-sm font-medium tabular-nums">
      {label} entered: {formatCents(enteredCents)}
      <span className={mismatch ? "text-destructive font-medium" : "text-muted-foreground"}>
        {" "}
        ({availableText}: {formatCents(availableCents)} · {handoverDiffLabel(enteredCents, availableCents)})
      </span>
    </p>
  )
}

type OpenFloatsBlocking = {
  outgoingPending: number
  outgoingAwaitingReceive: number
  incomingPendingApproval: number
  incomingAwaitingReceive: number
}

const EMPTY_OPEN_FLOATS: OpenFloatsBlocking = {
  outgoingPending: 0,
  outgoingAwaitingReceive: 0,
  incomingPendingApproval: 0,
  incomingAwaitingReceive: 0,
}

function openFloatsCount(blocking: OpenFloatsBlocking): number {
  return (
    blocking.outgoingPending +
    blocking.outgoingAwaitingReceive +
    blocking.incomingPendingApproval +
    blocking.incomingAwaitingReceive
  )
}

type EndShiftHandoverDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  shiftId: string
  fromUserId: string
  onSuccess: () => void
}

export function EndShiftHandoverDialog({
  open,
  onOpenChange,
  shiftId,
  fromUserId,
  onSuccess,
}: EndShiftHandoverDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [balance, setBalance] = useState<MyTillBalance | null>(null)
  const [heldInReconciliation, setHeldInReconciliation] = useState<{
    cardCents: number
    slipCents: number
    checkCents: number
    eWalletCents: number
    handoverCount: number
  } | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [handoverUsers, setHandoverUsers] = useState<
    { id: string; name: string; isBulkCashier?: boolean; staffCode?: string | null }[]
  >([])
  const [handoverUsersLoading, setHandoverUsersLoading] = useState(false)
  const [toUserId, setToUserId] = useState("")
  const [discrepancyReason, setDiscrepancyReason] = useState("")
  const [submitLoading, setSubmitLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [openFloatsBlocking, setOpenFloatsBlocking] = useState<OpenFloatsBlocking>(EMPTY_OPEN_FLOATS)
  const [openApprovalRequestsCount, setOpenApprovalRequestsCount] = useState(0)
  const [openApprovalRequestsMessage, setOpenApprovalRequestsMessage] = useState<string | null>(null)
  const [pendingHandoversToMe, setPendingHandoversToMe] = useState<{ id: string }[]>([])
  const [includableHandovers, setIncludableHandovers] = useState<{ id: string; createdAt: string; totalCents: number; fromUser: { name: string | null; staff: { code: string } | null } }[]>([])
  const [selectedIncludedHandoverIds, setSelectedIncludedHandoverIds] = useState<string[]>([])
  const [previousHandoversNote, setPreviousHandoversNote] = useState<
    { id: string; fromLabel: string; totalCents: number }[]
  >([])
  const [step1DataReady, setStep1DataReady] = useState(false)
  const [handoverPermissionDenied, setHandoverPermissionDenied] = useState<string | null>(null)
  const [canEndWithoutHandover, setCanEndWithoutHandover] = useState(false)
  const [endWithoutLoading, setEndWithoutLoading] = useState(false)
  const [billAttachments, setBillAttachments] = useState<ShiftBillAttachmentDto[]>([])
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([])
  const [billAttachmentsLoading, setBillAttachmentsLoading] = useState(false)
  const { toast } = useToast()
  const hasOpenFloats = openFloatsCount(openFloatsBlocking) > 0
  const hasOpenApprovalRequests = openApprovalRequestsCount > 0

  // Cash: denominations (notes 10+ ; coins 5, 2, 1 + cents)
  const [cashDenoms, setCashDenoms] = useState<DenominationEntry[]>(() =>
    CASH_ALL_DENOMS.map((v) => ({ value: v, count: 0 }))
  )

  // Non-cash: entries per method (reference + amount)
  const [cardEntries, setCardEntries] = useState<MethodEntry[]>([])
  const [slipEntries, setSlipEntries] = useState<MethodEntry[]>([])
  const [checkEntries, setCheckEntries] = useState<MethodEntry[]>([])
  const [creditEntries, setCreditEntries] = useState<MethodEntry[]>([])
  const [eWalletEntries, setEWalletEntries] = useState<MethodEntry[]>([])

  const uid = useId()
  const prepopulatedStep2Ref = useRef(false)

  useEffect(() => {
    if (!open) prepopulatedStep2Ref.current = false
  }, [open])

  // Debug: when handover popup opens, log whether this shift has any handovers received
  useEffect(() => {
    if (!open || !shiftId) return
    console.log("[Handover popup] Opened. Your current shiftId (the shift you are ending):", shiftId)
    getHandoversReceivedByShiftAction(shiftId).then((res) => {
      if (!res.success) {
        console.log("[Handover popup] Fetch failed or unauthorized:", res)
        return
      }
      const list = res.data ?? []
      const debug = (res as { debug?: { requestedShiftId: string; handoversReceivedByThisShift: number; handoversIApproved: { id: string; toShiftId: string | null; createdAt: string }[] } }).debug
      console.log("[Handover popup] Handovers received BY THIS SHIFT (toShiftId =", shiftId, "):", list.length, list.length ? list : "(none)")
      if (debug) {
        console.log("[Handover popup] DEBUG — Handovers you approved (toUserId = you), up to 10 recent:", debug.handoversIApproved)
        console.log("[Handover popup] DEBUG — For prepopulate we only use handovers where toShiftId === your current shiftId. If your approved handover has toShiftId different or null, it will not prepopulate.")
        const match = debug.handoversIApproved.filter((h) => h.toShiftId === shiftId)
        const other = debug.handoversIApproved.filter((h) => h.toShiftId !== shiftId)
        if (other.length > 0) console.log("[Handover popup] DEBUG — Approved handovers with toShiftId !== current shift (or null):", other)
        if (match.length > 0) console.log("[Handover popup] DEBUG — Approved handovers that match this shift:", match)
      }
      list.forEach((h, i) => {
        console.log(`[Handover popup] Handover ${i + 1} id:`, h.id, "enteredBreakdown:", h.enteredBreakdown)
      })
    })
  }, [open, shiftId])

  useEffect(() => {
    if (open && step === 1) {
      setToUserId("")
      setDiscrepancyReason("")
      setValidationErrors([])
      setPreviousHandoversNote([])
      setStep1DataReady(false)
      setHandoverPermissionDenied(null)
      setCanEndWithoutHandover(false)
      setOpenFloatsBlocking(EMPTY_OPEN_FLOATS)
      setOpenApprovalRequestsCount(0)
      setOpenApprovalRequestsMessage(null)
      setBalanceLoading(true)
      setBillAttachmentsLoading(true)
      listMyShiftBillAttachmentsAction()
        .then((res) => {
          if (res.success) {
            const unattached = res.data.filter((item) => !item.handoverId)
            setBillAttachments(unattached)
            setSelectedAttachmentIds(unattached.map((item) => item.id))
          } else {
            setBillAttachments([])
            setSelectedAttachmentIds([])
          }
        })
        .finally(() => setBillAttachmentsLoading(false))
      Promise.all([
        getMyTillBalance(),
        getHandoversToMeAction(),
        getIncludableHandoversForSenderAction(),
        shiftId
          ? getLinkedHandoversForShiftAction(shiftId)
          : Promise.resolve({ success: true as const, data: [] }),
        getNonCashHeldInReconciliationAction(),
        getPendingIncomingHandoverCountAction(),
        getOpenFloatsBlockingShiftEndAction(),
        getOpenApprovalRequestsBlockingShiftEndAction(),
        canEndShiftWithoutHandoverAction(),
      ])
        .then(([balanceRes, handoversToMeRes, includableRes, linkedRes, heldRes, pendingCountRes, openFloatsRes, openApprovalsRes, endWithoutRes]) => {
          if (balanceRes.success && balanceRes.data) {
            setBalance(balanceRes.data)
            setCashDenoms(CASH_ALL_DENOMS.map((v) => ({ value: v, count: 0 })))
            setCardEntries([])
            setSlipEntries([])
            setCheckEntries([])
            setCreditEntries([])
            setEWalletEntries([])
          } else {
            setBalance(null)
          }
          setHeldInReconciliation(heldRes.success && heldRes.data ? heldRes.data : null)
          setOpenFloatsBlocking(openFloatsRes.success ? openFloatsRes.blocking : EMPTY_OPEN_FLOATS)
          setOpenApprovalRequestsCount(openApprovalsRes.success ? openApprovalsRes.count : 0)
          setOpenApprovalRequestsMessage(openApprovalsRes.success ? openApprovalsRes.message : null)
          const pendingFromList =
            handoversToMeRes.success && handoversToMeRes.data?.length
              ? handoversToMeRes.data.map((h) => ({ id: h.id }))
              : []
          const pendingCount = pendingCountRes.success ? pendingCountRes.count : pendingFromList.length
          setPendingHandoversToMe(
            pendingFromList.length > 0
              ? pendingFromList
              : Array.from({ length: pendingCount }, (_, i) => ({ id: `pending-${i}` }))
          )
          setHandoverPermissionDenied(null)
          if (linkedRes.success && linkedRes.data?.length) {
            setPreviousHandoversNote(
              linkedRes.data.map((h) => ({
                id: h.id,
                fromLabel: h.fromLabel,
                totalCents: h.totalCents,
              }))
            )
          } else if (includableRes.success && includableRes.data?.length) {
            setPreviousHandoversNote(
              includableRes.data.map((h) => ({
                id: h.id,
                fromLabel: h.fromUser?.staff?.code
                  ? `${h.fromUser.name ?? "—"} (${h.fromUser.staff.code})`
                  : h.fromUser?.name ?? "—",
                totalCents: h.totalCents,
              }))
            )
          } else {
            setPreviousHandoversNote([])
          }
          if (!includableRes.success && "message" in includableRes && includableRes.message) {
            toast({ variant: "destructive", title: "Error", description: includableRes.message })
          }
          if (endWithoutRes.success) {
            setCanEndWithoutHandover(!!endWithoutRes.allowed)
          }
        })
        .catch((err) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: err?.message ?? "Failed to load handover data.",
          })
        })
        .finally(() => {
          setBalanceLoading(false)
          setStep1DataReady(true)
        })
    }
  }, [open, step, shiftId])

  // Prepopulate non-cash entries from handovers received by this shift (so user only adds what they collected).
  useEffect(() => {
    if (!open || step !== 2 || prepopulatedStep2Ref.current || !shiftId) return
    prepopulatedStep2Ref.current = true
    getHandoversReceivedByShiftAction(shiftId).then((res) => {
      if (!res.success || !res.data?.length) return
      type Entry = { reference: string; amountCents: number }
      const toMethodEntry = (e: Entry, i: number, method: string): MethodEntry => ({
        id: `${uid}-pre-${method}-${i}`,
        reference: e.reference ?? "",
        amount: e.amountCents != null ? (e.amountCents / 100).toFixed(2) : "",
      })
      const merge = (key: "cardEntries" | "slipEntries" | "checkEntries" | "creditEntries" | "eWalletEntries"): MethodEntry[] => {
        const out: MethodEntry[] = []
        res.data!.forEach((h, hIdx) => {
          const arr = (h.enteredBreakdown?.[key] ?? []) as Entry[]
          arr.forEach((e, i) => out.push(toMethodEntry(e, hIdx * 1000 + i, key)))
        })
        return out
      }
      setCardEntries(merge("cardEntries"))
      setSlipEntries(merge("slipEntries"))
      setCheckEntries(merge("checkEntries"))
      setCreditEntries(merge("creditEntries"))
      setEWalletEntries(merge("eWalletEntries"))
    })
  }, [open, step, shiftId, uid])

  useEffect(() => {
    if (open && (step === 2 || step === 3)) {
      setHandoverUsersLoading(true)
      getBulkCashierUsersAction()
        .then((res) => {
          if (res.success && res.data?.length) {
            const list = res.data
              .filter((u) => u.id !== fromUserId)
              .map((u) => ({
                id: u.id,
                name: u.name || u.email || u.id,
                isBulkCashier: u.isBulkCashier,
                staffCode: u.staffCode ?? null,
              }))
            setHandoverUsers(list)
          } else {
            setHandoverUsers([])
          }
        })
        .finally(() => setHandoverUsersLoading(false))
    }
  }, [open, step, fromUserId])

  useEffect(() => {
    if (!open || step !== 3) {
      setIncludableHandovers([])
      setSelectedIncludedHandoverIds([])
      return
    }
    getIncludableHandoversForSenderAction().then((res) => {
      if (res.success && res.data?.length) {
        setIncludableHandovers(
          res.data.map((h) => ({
            id: h.id,
            createdAt: typeof h.createdAt === "string" ? h.createdAt : (h.createdAt as Date).toISOString(),
            totalCents: h.totalCents,
            fromUser: h.fromUser ?? { name: null, staff: null },
          }))
        )
        setSelectedIncludedHandoverIds(res.data.map((h) => h.id))
      } else {
        setIncludableHandovers([])
        setSelectedIncludedHandoverIds([])
      }
    })
  }, [open, step])

  const handleProceed = () => {
    if (pendingHandoversToMe.length > 0) {
      toast({
        variant: "destructive",
        title: "Handovers need your action",
        description: `You have ${pendingHandoversToMe.length} handover(s) pending your acceptance. Accept or reject them on the Handovers page before submitting a handover.`,
      })
      return
    }
    if (hasOpenApprovalRequests) {
      toast({
        variant: "destructive",
        title: "Cancel/refund requests are still open",
        description:
          openApprovalRequestsMessage ??
          "Complete, withdraw, or wait for rejection before handing over.",
      })
      return
    }
    if (hasOpenFloats) {
      toast({
        variant: "destructive",
        title: "Float requests are still open",
        description:
          "Finish any pending approval or receive (or cancel/reject/decline) before handing over.",
      })
      return
    }
    setStep(2)
  }

  async function handleEndWithoutHandover() {
    if (!shiftId || !canEndWithoutHandover) return
    if (pendingHandoversToMe.length > 0) {
      toast({
        variant: "destructive",
        title: "Handovers need your action",
        description: `You have ${pendingHandoversToMe.length} handover(s) pending your acceptance. Accept or reject them on the Handovers page before ending your shift.`,
      })
      return
    }
    if (hasOpenApprovalRequests) {
      toast({
        variant: "destructive",
        title: "Cancel/refund requests are still open",
        description:
          openApprovalRequestsMessage ??
          "Complete, withdraw, or wait for rejection before ending your shift.",
      })
      return
    }
    if (hasOpenFloats) {
      toast({
        variant: "destructive",
        title: "Float requests are still open",
        description:
          "Finish any pending approval or receive (or cancel/reject/decline) before ending your shift.",
      })
      return
    }
    setEndWithoutLoading(true)
    try {
      await endShiftAction(shiftId)
      toast({ title: "Shift ended", description: "No till balance — closed without a handover." })
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not end shift",
        description: err instanceof Error ? err.message : "Failed to end shift.",
      })
    } finally {
      setEndWithoutLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    } else {
      setStep(2)
    }
    setValidationErrors([])
  }
  /** Validate that every method entry has reference and amount (amount can be 0). */
  const validateMethodEntries = (): string[] => {
    const errors: string[] = []
    const keys: ("cardCents" | "slipCents" | "checkCents" | "creditCents" | "eWalletCents")[] = [
      "cardCents",
      "slipCents",
      "checkCents",
      "creditCents",
      "eWalletCents",
    ]
    keys.forEach((key) => {
      const entries = entriesByKey[key]
      const label = METHOD_LABELS[key]
      entries.forEach((e, idx) => {
        if (!e.reference.trim()) {
          errors.push(`${label}: Reference is required for entry ${idx + 1}.`)
        }
        if (e.amount.trim() === "") {
          errors.push(`${label}: Amount is required for entry ${idx + 1} (can be 0).`)
        }
      })
    })
    return errors
  }

  const handleToSummary = () => {
    const entryErrors = validateMethodEntries()
    if (entryErrors.length > 0) {
      setValidationErrors(entryErrors)
      return
    }
    setValidationErrors([])
    setStep(3)
  }

  const updateCashDenom = (value: number, count: number) => {
    const normalizedCount = Math.max(0, Math.trunc(Number(count) || 0))
    setCashDenoms((prev) => {
      const i = prev.findIndex((d) => matchDenom(d.value, value))
      if (i < 0) return prev
      const next = [...prev]
      next[i] = { ...next[i], count: normalizedCount }
      return next
    })
  }

  const cashTotalLKR = denominationsTotalLKR(cashDenoms)
  const cashTotalCents = lkrToCents(cashTotalLKR)

  const entriesToCents = (entries: MethodEntry[]): number =>
    entries.reduce((sum, e) => sum + centsFromLkrString(e.amount), 0)

  const cardCents = entriesToCents(cardEntries)
  const slipCents = entriesToCents(slipEntries)
  const checkCents = entriesToCents(checkEntries)
  const creditCents = entriesToCents(creditEntries)
  const eWalletCents = entriesToCents(eWalletEntries)

  /** Till amounts expected on this handover: full till minus non-cash held in open reconciliation. */
  const expectedBalance = balance
    ? {
        cashCents: balance.cashCents,
        cardCents: Math.max(0, balance.cardCents - (heldInReconciliation?.cardCents ?? 0)),
        slipCents: Math.max(0, balance.slipCents - (heldInReconciliation?.slipCents ?? 0)),
        checkCents: Math.max(0, balance.checkCents - (heldInReconciliation?.checkCents ?? 0)),
        creditCents: balance.creditCents,
        eWalletCents: Math.max(0, balance.eWalletCents - (heldInReconciliation?.eWalletCents ?? 0)),
      }
    : null

  const setEntriesFor = (key: "cardCents" | "slipCents" | "checkCents" | "creditCents" | "eWalletCents") => {
    const setters = {
      cardCents: setCardEntries,
      slipCents: setSlipEntries,
      checkCents: setCheckEntries,
      creditCents: setCreditEntries,
      eWalletCents: setEWalletEntries,
    }
    return setters[key]
  }

  const addEntry = (key: "cardCents" | "slipCents" | "checkCents" | "creditCents" | "eWalletCents") => {
    const setter = setEntriesFor(key)
    setter((prev) => [...prev, { id: `${uid}-${Math.random().toString(36).slice(2)}`, reference: "", amount: "" }])
  }

  const removeEntry = (
    key: "cardCents" | "slipCents" | "checkCents" | "creditCents" | "eWalletCents",
    id: string
  ) => {
    const setter = setEntriesFor(key)
    setter((prev) => prev.filter((e) => e.id !== id))
  }

  const updateEntry = (
    key: "cardCents" | "slipCents" | "checkCents" | "creditCents" | "eWalletCents",
    id: string,
    field: "reference" | "amount",
    value: string
  ) => {
    const setter = setEntriesFor(key)
    setter((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    )
  }

  const entriesByKey = {
    cardCents: cardEntries,
    slipCents: slipEntries,
    checkCents: checkEntries,
    creditCents: creditEntries,
    eWalletCents: eWalletEntries,
  } as const

  const enteredAmounts = {
    cashCents: cashTotalCents,
    cardCents,
    slipCents,
    checkCents,
    creditCents,
    eWalletCents,
  }
  const amountOvers = expectedBalance ? getHandoverAmountOvers(enteredAmounts, expectedBalance) : []
  const hasOver = amountOvers.length > 0
  const hasShort =
    expectedBalance &&
    (cashTotalCents < expectedBalance.cashCents ||
      cardCents < expectedBalance.cardCents ||
      slipCents < expectedBalance.slipCents ||
      checkCents < expectedBalance.checkCents ||
      creditCents < expectedBalance.creditCents ||
      eWalletCents < expectedBalance.eWalletCents)
  const needsDiscrepancyReason = !!hasShort && !hasOver

  const validateAndSubmit = async () => {
    if (!expectedBalance || !toUserId) return
    const errors: string[] = []
    errors.push(...validateMethodEntries())
    if (hasOver) {
      errors.push(formatHandoverOverAmountError(amountOvers, "submit"))
    }
    if (needsDiscrepancyReason && !discrepancyReason.trim()) {
      errors.push("Please provide a reason for the discrepancy.")
    }
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    setValidationErrors([])
    setSubmitLoading(true)
    try {
      const pendingCheck = await getPendingIncomingHandoverCountAction()
      if (pendingCheck.success && pendingCheck.count > 0) {
        setSubmitLoading(false)
        toast({
          variant: "destructive",
          title: "Handovers need your action",
          description: `You have ${pendingCheck.count} handover(s) pending your acceptance. Accept or reject them on the Handovers page before submitting a handover.`,
        })
        return
      }
      const pendingApprovalCheck = await getOpenApprovalRequestsBlockingShiftEndAction()
      if (pendingApprovalCheck.success && pendingApprovalCheck.count > 0) {
        setSubmitLoading(false)
        toast({
          variant: "destructive",
          title: "Cancel/refund requests are still open",
          description:
            pendingApprovalCheck.message ??
            "Complete, withdraw, or wait for rejection before submitting a handover.",
        })
        return
      }
      const pendingFloatCheck = await getOpenFloatsBlockingShiftEndAction()
      if (pendingFloatCheck.success && pendingFloatCheck.count > 0) {
        setSubmitLoading(false)
        toast({
          variant: "destructive",
          title: "Float requests are still open",
          description:
            "Finish any pending approval or receive (or cancel/reject/decline) before submitting a handover.",
        })
        return
      }
      // Build full breakdown from current state so bulk cashier can verify denominations and references on the detail page
      const enteredBreakdown = {
        cashDenominations: cashDenoms
          .filter((d) => d != null && Number(d.count) > 0)
          .map((d) => ({ value: Number(d.value), count: Number(d.count) })),
        cardEntries: cardEntries
          .filter((e) => e && (String(e.reference).trim() !== "" || String(e.amount).trim() !== ""))
          .map((e) => ({ reference: String(e.reference).trim(), amountCents: centsFromLkrString(String(e.amount)) })),
        slipEntries: slipEntries
          .filter((e) => e && (String(e.reference).trim() !== "" || String(e.amount).trim() !== ""))
          .map((e) => ({ reference: String(e.reference).trim(), amountCents: centsFromLkrString(String(e.amount)) })),
        checkEntries: checkEntries
          .filter((e) => e && (String(e.reference).trim() !== "" || String(e.amount).trim() !== ""))
          .map((e) => ({ reference: String(e.reference).trim(), amountCents: centsFromLkrString(String(e.amount)) })),
        creditEntries: creditEntries
          .filter((e) => e && (String(e.reference).trim() !== "" || String(e.amount).trim() !== ""))
          .map((e) => ({ reference: String(e.reference).trim(), amountCents: centsFromLkrString(String(e.amount)) })),
        eWalletEntries: eWalletEntries
          .filter((e) => e && (String(e.reference).trim() !== "" || String(e.amount).trim() !== ""))
          .map((e) => ({ reference: String(e.reference).trim(), amountCents: centsFromLkrString(String(e.amount)) })),
      }
      const idsToInclude = selectedIncludedHandoverIds.length > 0 ? selectedIncludedHandoverIds : undefined
      await submitShiftHandoverAction({
        shiftId,
        toUserId,
        amounts: {
          cashCents: cashTotalCents,
          cardCents,
          slipCents,
          checkCents,
          creditCents,
          eWalletCents,
        },
        discrepancyReason: discrepancyReason.trim() || undefined,
        enteredBreakdown,
        includedHandoverIds: idsToInclude,
        attachmentIds: selectedAttachmentIds.length > 0 ? selectedAttachmentIds : undefined,
      })
      const recipientName = handoverUsers.find((u) => u.id === toUserId)?.name ?? "recipient"
      toast({ title: `Handover submitted. Waiting for ${recipientName} to approve.` })
      onOpenChange(false)
      onSuccess()
    } catch (e) {
      toast({
        title: "Handover failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 &&
              (canEndWithoutHandover ? "End shift" : "End shift – Current till balance")}
            {step === 2 && "Enter handover amounts"}
            {step === 3 && "Confirm handover"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 &&
              (canEndWithoutHandover
                ? "Till is empty and there is nothing to hand over. You can end this shift without creating a handover."
                : "Review your till balance by method. Then proceed to enter amounts and assign the handover.")}
            {step === 2 &&
              "Entries from handovers not sent to reconciliation are pre-filled. You may hand over less than available (with a reason). You cannot hand over more than the till holds."}
            {step === 3 &&
              "Review the summary below, check any warnings, select the person receiving the handover, then confirm."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <>
            {previousHandoversNote.length > 0 && (
              <Alert className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40">
                <CircleAlert className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-200">Handovers that will go with this</AlertTitle>
                <AlertDescription className="space-y-1">
                  <p>You received these on this shift. They will be included when you hand over.</p>
                  <ul className="mt-1 space-y-0.5">
                    {previousHandoversNote.map((h) => (
                      <li key={h.id} className="flex flex-wrap justify-between gap-x-3 text-sm">
                        <span className="font-medium text-foreground">From {h.fromLabel}</span>
                        <span className="tabular-nums">LKR {formatCents(h.totalCents)}</span>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {heldInReconciliation && heldInReconciliation.handoverCount > 0 && (
              <Alert className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
                <CircleAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-amber-800 dark:text-amber-200">Held for reconciliation</AlertTitle>
                <AlertDescription>
                  {heldInReconciliation.handoverCount} handover(s) are in reconciliation and will stay with you.
                  Their non-cash amounts are not pre-filled and will not transfer to the next bulk cashier
                  {heldInReconciliation.cardCents +
                    heldInReconciliation.slipCents +
                    heldInReconciliation.checkCents +
                    heldInReconciliation.eWalletCents >
                  0
                    ? ` (held: card ${formatCents(heldInReconciliation.cardCents)}, slips ${formatCents(heldInReconciliation.slipCents)}, cheques ${formatCents(heldInReconciliation.checkCents)}, e-wallet ${formatCents(heldInReconciliation.eWalletCents)})`
                    : ""}
                  .
                </AlertDescription>
              </Alert>
            )}
            {handoverPermissionDenied && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Handover not allowed</AlertTitle>
                <AlertDescription>{handoverPermissionDenied}</AlertDescription>
              </Alert>
            )}
            {pendingHandoversToMe.length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Handovers need your action</AlertTitle>
                <AlertDescription>
                  You have {pendingHandoversToMe.length} handover{pendingHandoversToMe.length !== 1 ? "s" : ""} pending your
                  acceptance. Accept or reject them on the{" "}
                  <Link href="/handovers" className="underline font-medium hover:no-underline" onClick={() => onOpenChange(false)}>
                    Handovers page
                  </Link>{" "}
                  before you can end your shift and hand over.
                </AlertDescription>
              </Alert>
            )}
            {hasOpenApprovalRequests && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Cancel/refund requests are still open</AlertTitle>
                <AlertDescription>
                  {openApprovalRequestsMessage ??
                    "Complete, withdraw, or wait for rejection before ending your shift."}{" "}
                  <Link href="/approvals" className="underline font-medium hover:no-underline" onClick={() => onOpenChange(false)}>
                    Open Approval Center
                  </Link>
                </AlertDescription>
              </Alert>
            )}
            {hasOpenFloats && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Float requests are still open</AlertTitle>
                <AlertDescription className="space-y-1">
                  {openFloatsBlocking.outgoingPending > 0 && (
                    <p>
                      You have {openFloatsBlocking.outgoingPending} float request
                      {openFloatsBlocking.outgoingPending !== 1 ? "s" : ""} waiting for bulk cashier approval. Cancel from
                      the top bar, or wait until it is approved and you have received it.
                    </p>
                  )}
                  {openFloatsBlocking.outgoingAwaitingReceive > 0 && (
                    <p>
                      You have {openFloatsBlocking.outgoingAwaitingReceive} approved float
                      {openFloatsBlocking.outgoingAwaitingReceive !== 1 ? "s" : ""} not received yet. Receive or decline
                      {openFloatsBlocking.outgoingAwaitingReceive !== 1 ? " them" : " it"} from the top bar first.
                    </p>
                  )}
                  {openFloatsBlocking.incomingPendingApproval > 0 && (
                    <p>
                      You have {openFloatsBlocking.incomingPendingApproval} float request
                      {openFloatsBlocking.incomingPendingApproval !== 1 ? "s" : ""} waiting for you to approve or reject on
                      the{" "}
                      <Link href="/bulk-cashier" className="underline font-medium hover:no-underline" onClick={() => onOpenChange(false)}>
                        Bulk Cashier page
                      </Link>
                      .
                    </p>
                  )}
                  {openFloatsBlocking.incomingAwaitingReceive > 0 && (
                    <p>
                      You have {openFloatsBlocking.incomingAwaitingReceive} approved float
                      {openFloatsBlocking.incomingAwaitingReceive !== 1 ? "s" : ""} the cashier has not received yet. Wait
                      until they receive or decline before you can end this shift.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {balanceLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : canEndWithoutHandover ? (
              <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
                <p className="text-sm font-medium">No amount to hand over</p>
                <p className="text-sm text-muted-foreground">
                  Till total is {formatCents(balance?.totalCents ?? 0)}. Ending the shift will not create a handover.
                </p>
              </div>
            ) : balance ? (
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                  {METHOD_KEYS.map((key) => {
                    const cents = balance[key]
                    if (typeof cents !== "number" || cents === 0) return null
                    return (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{METHOD_LABELS[key]}</span>
                        <span className="font-medium tabular-nums">{formatCents(cents)}</span>
                      </div>
                    )
                  })}
                  <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-2">
                    <span>Total</span>
                    <span className="tabular-nums">{formatCents(balance.totalCents)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No till balance found.</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={endWithoutLoading}>
                Cancel
              </Button>
              {canEndWithoutHandover ? (
                <Button
                  onClick={handleEndWithoutHandover}
                  disabled={!step1DataReady || endWithoutLoading || pendingHandoversToMe.length > 0 || hasOpenFloats || hasOpenApprovalRequests}
                >
                  {endWithoutLoading || !step1DataReady ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  End shift
                </Button>
              ) : (
                <Button
                  onClick={handleProceed}
                  disabled={!step1DataReady || balanceLoading || !balance || pendingHandoversToMe.length > 0 || hasOpenFloats || hasOpenApprovalRequests || !!handoverPermissionDenied}
                >
                  {!step1DataReady ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>
                      Proceed to handover
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </>
        )}

        {step === 2 && balance && expectedBalance && (
          <>
            <Tabs defaultValue="cash" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1">
                {METHOD_TABS.map(({ key, value, label, Icon }) => {
                  const entered =
                    key === "cashCents"
                      ? cashTotalCents
                      : key === "cardCents"
                        ? cardCents
                        : key === "slipCents"
                          ? slipCents
                          : key === "checkCents"
                            ? checkCents
                            : key === "creditCents"
                              ? creditCents
                              : eWalletCents
                  const expected = typeof expectedBalance[key] === "number" ? expectedBalance[key] : 0
                  const hasValue = expected > 0
                  const isCorrect = hasValue && entered === expected
                  const needsAttention = hasValue && entered !== expected
                  return (
                    <TabsTrigger
                      key={key}
                      value={value}
                      className={cn(
                        "text-xs sm:text-sm gap-1.5",
                        entered > 0 && "font-semibold",
                        isCorrect &&
                          "border-emerald-500/60 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-500/50 data-[state=active]:border-emerald-500 data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30",
                        needsAttention &&
                          "border-amber-500/70 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-500/50 data-[state=active]:border-amber-500 data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{label}</span>
                      {isCorrect && (
                        <CheckCircle2
                          className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                          aria-label="Correct"
                        />
                      )}
                      {needsAttention && (
                        <CircleAlert
                          className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                          aria-label="Needs attention"
                        />
                      )}
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              <TabsContent value="cash" className="mt-3 overflow-y-auto max-h-[50vh] pr-1">
                <div className="space-y-3">
                  <HandoverTabAmountSummary
                    label="Cash"
                    enteredCents={cashTotalCents}
                    availableCents={expectedBalance.cashCents}
                  />
                  <div className="flex gap-4">
                    <div className="flex-1 min-w-0 rounded-md border overflow-hidden">
                      <div className="bg-muted/60 px-2 py-1.5 text-xs font-medium">Notes & Coins (10 LKR+)</div>
                      <table className="w-full text-sm border-collapse">
                        <tbody>
                          {CASH_NOTES.map((v) => {
                            const d = cashDenoms.find((x) => matchDenom(x.value, v))
                            const count = d?.count ?? 0
                            return (
                              <tr key={`rupee-${v}`} className="border-b last:border-b-0">
                                <td className="py-1 px-2 text-left tabular-nums font-medium">{formatDenomLabel(v)}</td>
                                <td className="py-1 px-1 text-muted-foreground text-center">×</td>
                                <td className="py-1 px-2 text-right">
                                  <div className="flex justify-end">
                                    <Input type="number" min={0} className="h-7 w-14 text-right tabular-nums text-sm" value={count} onChange={(e) => updateCashDenom(v, Math.max(0, parseInt(e.target.value, 10) || 0))} />
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex-1 min-w-0 rounded-md border overflow-hidden">
                      <div className="bg-muted/60 px-2 py-1.5 text-xs font-medium">Coins (below 10)</div>
                      <table className="w-full text-sm border-collapse">
                        <tbody>
                          {CASH_COINS.map((v, i) => {
                            const d = cashDenoms.find((x) => matchDenom(x.value, v))
                            const count = d?.count ?? 0
                            return (
                              <tr key={`cent-${i}`} className="border-b last:border-b-0">
                                <td className="py-1 px-2 text-left tabular-nums font-medium">{formatDenomLabel(v)}</td>
                                <td className="py-1 px-1 text-muted-foreground text-center">×</td>
                                <td className="py-1 px-2 text-right">
                                  <div className="flex justify-end">
                                    <Input type="number" min={0} step={1} className="h-7 w-14 text-right tabular-nums text-sm" value={count} onChange={(e) => updateCashDenom(v, Math.max(0, parseInt(e.target.value, 10) || 0))} />
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {(["cardCents", "slipCents", "checkCents", "creditCents", "eWalletCents"] as const).map(
                (key) => {
                  const tabValue = key === "cardCents" ? "card" : key === "slipCents" ? "slips" : key === "checkCents" ? "cheques" : key === "creditCents" ? "credit" : "eWallet"
                  const tillBalanceLabel = key === "cardCents" ? "card" : key === "slipCents" ? "slips" : key === "checkCents" ? "cheques" : key === "creditCents" ? "credit" : "e-wallet"
                  const tabLabel = key === "cardCents" ? "Card" : key === "slipCents" ? "Slips" : key === "checkCents" ? "Cheques" : key === "creditCents" ? "Credit" : "E-Wallet"
                  const expected = typeof expectedBalance[key] === "number" ? expectedBalance[key] : 0
                  const entries = entriesByKey[key]
                  const total = entriesToCents(entries)
                  return (
                    <TabsContent key={key} value={tabValue} className="mt-3 overflow-y-auto max-h-[50vh] pr-1">
                      <div className="space-y-2">
                        <HandoverTabAmountSummary
                          label={tabLabel}
                          enteredCents={total}
                          availableCents={expected}
                          availableSuffix={tillBalanceLabel}
                        />
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => addEntry(key)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add entry
                          </Button>
                        </div>
                        <div className="rounded border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/60 border-b">
                                <th className="text-left font-medium p-2">Reference</th>
                                <th className="text-right font-medium p-2 w-28">Amount (LKR)</th>
                                <th className="w-10 p-1" />
                              </tr>
                            </thead>
                            <tbody>
                              {entries.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="text-muted-foreground p-2 text-center">
                                    No entries. Click Add entry.
                                  </td>
                                </tr>
                              ) : (
                                entries.map((e) => {
                                  const referenceError = !e.reference.trim()
                                  const amountError = e.amount.trim() === ""
                                  return (
                                    <tr key={e.id} className="border-b last:border-b-0">
                                      <td className="p-1 align-top">
                                        <div className="space-y-0.5">
                                          <Input
                                            placeholder="e.g. slip no."
                                            className={cn("h-9", referenceError && "border-destructive focus-visible:ring-destructive")}
                                            value={e.reference}
                                            onChange={(ev) => updateEntry(key, e.id, "reference", ev.target.value)}
                                          />
                                          {referenceError && (
                                            <p className="text-xs text-destructive">Reference is required</p>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-1 text-right align-top">
                                        <div className="space-y-0.5 flex flex-col items-end">
                                          <Input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            placeholder="0.00"
                                            className={cn("h-9 w-24 text-right tabular-nums ml-auto", amountError && "border-destructive focus-visible:ring-destructive")}
                                            value={e.amount}
                                            onChange={(ev) => {
                                              const v = ev.target.value
                                              if (v === "" || v === ".") {
                                                updateEntry(key, e.id, "amount", v)
                                                return
                                              }
                                              const dotIdx = v.indexOf(".")
                                              if (dotIdx !== -1 && v.length - dotIdx - 1 > 2) {
                                                const n = parseFloat(v)
                                                if (!Number.isNaN(n) && n >= 0) updateEntry(key, e.id, "amount", n.toFixed(2))
                                                return
                                              }
                                              if (parseFloat(v) < 0) return
                                              updateEntry(key, e.id, "amount", v)
                                            }}
                                            onBlur={() => {
                                              const n = parseFloat(e.amount)
                                              const formatted = Number.isNaN(n) || n < 0 ? "0.00" : n.toFixed(2)
                                              if (formatted !== e.amount) updateEntry(key, e.id, "amount", formatted)
                                            }}
                                          />
                                          {amountError && (
                                            <p className="text-xs text-destructive">Amount required (can be 0)</p>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                          onClick={() => removeEntry(key, e.id)}
                                          aria-label="Remove entry"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </td>
                                    </tr>
                                  )
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </TabsContent>
                  )
                }
              )}
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={handleBack} disabled={submitLoading}>
                Back
              </Button>
              <Button onClick={handleToSummary} disabled={submitLoading}>
                Next: Review & assign
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && balance && (
          <>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">Handover summary</p>
              {METHOD_KEYS.map((key) => {
                const cents =
                  key === "cashCents"
                    ? cashTotalCents
                    : key === "cardCents"
                      ? cardCents
                      : key === "slipCents"
                        ? slipCents
                        : key === "checkCents"
                          ? checkCents
                          : key === "creditCents"
                            ? creditCents
                            : eWalletCents
                if (typeof cents !== "number" || cents === 0) return null
                return (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{METHOD_LABELS[key]}</span>
                    <span className="font-medium tabular-nums">{formatCents(cents)}</span>
                  </div>
                )
              })}
              <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-2">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatCents(
                    cashTotalCents +
                      cardCents +
                      slipCents +
                      checkCents +
                      creditCents +
                      eWalletCents
                  )}
                </span>
              </div>
            </div>

            {(() => {
              if (!expectedBalance) return null
              const TOLERANCE_CENTS = 1000 // 1 LKR or less: no warning
              const isSignificantDiff = (entered: number, till: number) =>
                Math.abs(till - entered) > TOLERANCE_CENTS
              const mismatches: { label: string; enteredCents: number; tillCents: number }[] = []
              if (isSignificantDiff(cashTotalCents, expectedBalance.cashCents))
                mismatches.push({ label: "Cash", enteredCents: cashTotalCents, tillCents: expectedBalance.cashCents })
              if (isSignificantDiff(cardCents, expectedBalance.cardCents))
                mismatches.push({ label: "Credit card slips", enteredCents: cardCents, tillCents: expectedBalance.cardCents })
              if (isSignificantDiff(slipCents, expectedBalance.slipCents))
                mismatches.push({ label: "Slips", enteredCents: slipCents, tillCents: expectedBalance.slipCents })
              if (isSignificantDiff(checkCents, expectedBalance.checkCents))
                mismatches.push({ label: "Cheques", enteredCents: checkCents, tillCents: expectedBalance.checkCents })
              if (isSignificantDiff(creditCents, expectedBalance.creditCents))
                mismatches.push({ label: "Credit", enteredCents: creditCents, tillCents: expectedBalance.creditCents })
              if (isSignificantDiff(eWalletCents, expectedBalance.eWalletCents))
                mismatches.push({ label: "E-Wallet", enteredCents: eWalletCents, tillCents: expectedBalance.eWalletCents })
              return mismatches.length > 0 ? (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
                    {hasOver
                      ? "Cannot hand over more than the till holds"
                      : "Entered amounts are less than available"}
                  </AlertTitle>
                  <AlertDescription>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {hasOver
                          ? formatHandoverOverAmountError(amountOvers, "submit")
                          : "You may hand over less than available. A reason is required. The transfer will use the amounts you entered; any shortfall remains in your till."}
                      </p>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-destructive/30">
                            <th className="text-left py-2 pr-4 font-medium">Method</th>
                            <th className="text-right py-2 px-2 font-medium tabular-nums">Entered</th>
                            <th className="text-right py-2 px-2 font-medium tabular-nums">Available</th>
                            <th className="text-right py-2 pl-2 font-medium tabular-nums">Difference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mismatches.map((m) => {
                            const diff = m.tillCents - m.enteredCents
                            return (
                              <tr key={m.label} className="border-b border-destructive/20 last:border-0">
                                <td className="py-2 pr-4">{m.label}</td>
                                <td className="text-right py-2 px-2 tabular-nums">{formatCents(m.enteredCents)}</td>
                                <td className="text-right py-2 px-2 tabular-nums">{formatCents(m.tillCents)}</td>
                                <td className="text-right py-2 pl-2 tabular-nums">
                                  {diff > 0 ? (
                                    <span className="text-destructive font-medium">Short {formatCents(diff)}</span>
                                  ) : (
                                    <span className="text-destructive/80">Over {formatCents(Math.abs(diff))}</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : null
            })()}

            <div className="space-y-3 mt-4">
              <div className="space-y-1">
                <Label>Hand over to</Label>
                {handoverUsersLoading ? (
                  <div className="flex h-10 w-full items-center gap-2 rounded-md border border-input px-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : (
                  <SearchableUserSelect
                    label="person"
                    options={handoverUsers}
                    value={toUserId}
                    onChange={setToUserId}
                    placeholder="Select person"
                    disabled={handoverUsers.length === 0}
                  />
                )}
                {handoverUsers.length === 0 && !handoverUsersLoading && (
                  <p className="text-xs text-muted-foreground">No other users available.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  Bill photos
                </Label>
                {billAttachmentsLoading ? (
                  <p className="text-xs text-muted-foreground">Loading photos…</p>
                ) : billAttachments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No photos on this shift. You can still submit. Add photos from the camera button on the shift bar.
                  </p>
                ) : (
                  <div className="space-y-2 rounded-md border p-2">
                    <p className="text-xs text-muted-foreground">
                      Selected photos will be attached to this handover. Photos received from a previous handover are included automatically.
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {billAttachments.map((item) => {
                      const checked = selectedAttachmentIds.includes(item.id)
                      const label = item.kind ? SHIFT_BILL_KIND_LABELS[item.kind] : "Bill"
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "relative overflow-hidden rounded-md border bg-muted",
                            checked && "ring-2 ring-primary ring-offset-1"
                          )}
                        >
                          <label className="block cursor-pointer">
                            <span className="absolute left-1.5 top-1.5 z-10 rounded-sm bg-background/90">
                              <Checkbox
                                checked={checked || item.inherited}
                                disabled={item.inherited}
                                onCheckedChange={(value) => {
                                  if (item.inherited) return
                                  setSelectedAttachmentIds((prev) =>
                                    value === true
                                      ? prev.includes(item.id)
                                        ? prev
                                        : [...prev, item.id]
                                      : prev.filter((id) => id !== item.id)
                                  )
                                }}
                              />
                            </span>
                            <span className="block aspect-square">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.thumbUrl}
                                alt={label}
                                className="h-full w-full object-cover"
                              />
                            </span>
                            <span className="block px-2 py-1.5">
                              <span className="block truncate text-xs font-medium">
                                {label}
                                {item.note ? ` · ${item.note}` : ""}
                              </span>
                              <span className="mt-0.5 inline-flex max-w-full truncate rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {shiftBillUploaderTag(item)}
                              </span>
                            </span>
                          </label>
                          <a
                            href={item.viewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open large view in a new tab"
                            className="absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-1 text-[11px] font-medium text-foreground shadow-sm hover:bg-background"
                          >
                            <ZoomIn className="h-3.5 w-3.5" />
                            View
                          </a>
                        </div>
                      )
                    })}
                    </div>
                  </div>
                )}
              </div>

              {includableHandovers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  The following handover(s) will be included (no action needed):{" "}
                  {includableHandovers
                    .map((h) => {
                      const fromLabel = h.fromUser?.staff?.code ? `${h.fromUser.name ?? "—"} (${h.fromUser.staff.code})` : h.fromUser?.name ?? "—"
                      return `${fromLabel} ${formatCents(h.totalCents)}`
                    })
                    .join("; ")}
                </p>
              )}

              {needsDiscrepancyReason && (
                <div className="space-y-1">
                  <Label htmlFor="discrepancy-reason">
                    Reason for discrepancy <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="discrepancy-reason"
                    placeholder="e.g. Counting difference, missing slip…"
                    value={discrepancyReason}
                    onChange={(e) => setDiscrepancyReason(e.target.value)}
                    className="min-h-[80px] resize-y"
                    maxLength={500}
                  />
                </div>
              )}

              {validationErrors.length > 0 && (
                <ul className="text-sm text-destructive list-disc list-inside space-y-0.5">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleBack} disabled={submitLoading}>
                Back
              </Button>
              <Button
                onClick={validateAndSubmit}
                disabled={
                  submitLoading ||
                  !toUserId ||
                  handoverUsersLoading ||
                  handoverUsers.length === 0 ||
                  hasOver ||
                  (needsDiscrepancyReason && !discrepancyReason.trim()) ||
                  pendingHandoversToMe.length > 0 ||
                  hasOpenFloats ||
                  hasOpenApprovalRequests
                }
              >
                {submitLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Confirm handover & end shift
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
