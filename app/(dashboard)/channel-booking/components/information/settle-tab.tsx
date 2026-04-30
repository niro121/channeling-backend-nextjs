"use client"

import { useEffect, useState } from "react"
import {
  getBookingDetails,
  getBanksForChannelBooking,
  getBookingsBySession,
  settleBookingAction,
} from "@/app/actions/channel-booking"
import type {
  BookingDetailsView,
  SettlementDetailsView,
} from "@/services/channel-booking/get-booking-details.service"
import type { ChannelBookingBankOption } from "@/services/channel-booking/reference/get-banks.service"
import { useChannelBooking } from "../../context/channel-booking-context"
import { useToast } from "@/components/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle2, Receipt } from "lucide-react"
import {
  SAVE_PAYMENT_TYPE_CASH,
  SAVE_PAYMENT_TYPE_CREDIT_CARD,
  SAVE_PAYMENT_TYPE_E_WALLET,
  SAVE_PAYMENT_TYPE_MIXED,
  SAVE_PAYMENT_TYPE_SLIP,
} from "@/types/save-booking"

const SETTLE_METHODS = [
  { value: SAVE_PAYMENT_TYPE_CASH, label: "Cash" },
  { value: SAVE_PAYMENT_TYPE_CREDIT_CARD, label: "Credit Card" },
  { value: SAVE_PAYMENT_TYPE_SLIP, label: "Slip" },
  { value: SAVE_PAYMENT_TYPE_MIXED, label: "Mixed" },
] as const

type MixedLine = { payment_method: number; amount: string }
type MixedLineWithMeta = MixedLine & { bank_id: string; card: string; slip_ref: string }

const DEFAULT_MIXED_LINES: MixedLineWithMeta[] = [
  { payment_method: SAVE_PAYMENT_TYPE_CASH, amount: "", bank_id: "", card: "", slip_ref: "" },
  { payment_method: SAVE_PAYMENT_TYPE_CREDIT_CARD, amount: "", bank_id: "", card: "", slip_ref: "" },
]

function formatRs(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatSettledAt(d: Date): string {
  return new Date(d).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })
}

function SettlementDetailsCard({ settlement }: { settlement: SettlementDetailsView }) {
  return (
    <div className="flex flex-1 flex-col min-h-0 rounded-lg border border-border bg-muted/10">
      <div className="flex items-center gap-2 p-3 border-b border-border/60">
        <Receipt className="size-5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-foreground uppercase tracking-wider text-muted-foreground">
          Settlement details
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        <Row label="Receipt No" value={settlement.receiptNoString} />
        <Row label="Settled at" value={formatSettledAt(settlement.settledAt)} />
        <Row label="Payment method" value={settlement.paymentMethodName} />
        <Row label="Amount paid" value={formatRs(settlement.amount)} highlight />
        {settlement.paymentLines.length > 0 && (
          <div className="space-y-1 py-1">
            <div className="text-[11px] font-medium text-muted-foreground">Payment Lines</div>
            {settlement.paymentLines.map((line, idx) => (
              <Row
                key={`${line.paymentMethod}-${idx}`}
                label={line.paymentMethodName}
                value={formatRs(line.amount)}
              />
            ))}
          </div>
        )}
        {settlement.bank ? <Row label="Bank" value={settlement.bank} /> : null}
        {settlement.cardReference ? (
          <Row label="Card (last 4)" value={settlement.cardReference} />
        ) : null}
        {settlement.slipReference ? (
          <Row label="Slip reference" value={settlement.slipReference} />
        ) : null}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex justify-between gap-2 py-1.5 border-b border-border/40 last:border-0 text-xs ${highlight ? "bg-primary/10 rounded px-2 -mx-0.5" : ""}`}
    >
      <span className={highlight ? "font-semibold text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={highlight ? "font-semibold text-foreground" : "text-foreground text-right break-words"}>
        {value}
      </span>
    </div>
  )
}

export function SettleTab({ onSettleSuccess }: { onSettleSuccess?: () => void }) {
  const { selectedBooking, selectedSession, setBookings, setSelectedBooking } = useChannelBooking()
  const { toast } = useToast()
  const [details, setDetails] = useState<BookingDetailsView | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [banks, setBanks] = useState<ChannelBookingBankOption[]>([])
  const [settleMethod, setSettleMethod] = useState<number>(SAVE_PAYMENT_TYPE_CASH)
  const [card, setCard] = useState("")
  const [slipRef, setSlipRef] = useState("")
  const [bankId, setBankId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [mixedDialogOpen, setMixedDialogOpen] = useState(false)
  const [mixedLines, setMixedLines] = useState<MixedLineWithMeta[]>(DEFAULT_MIXED_LINES)

  function resetMixedDialog() {
    setMixedDialogOpen(false)
    setMixedLines(DEFAULT_MIXED_LINES)
  }

  useEffect(() => {
    if (!selectedBooking?.id) {
      setDetails(null)
      setDetailsError(null)
      return
    }
    setLoading(true)
    setDetailsError(null)
    getBookingDetails(selectedBooking.id)
      .then((res) => {
        if (res.success && res.data) setDetails(res.data)
        else {
          setDetails(null)
          setDetailsError(res.message ?? "Failed to load")
        }
      })
      .finally(() => setLoading(false))
  }, [selectedBooking?.id])

  useEffect(() => {
    getBanksForChannelBooking().then((res) => {
      if (res.success && res.data) setBanks(res.data)
    })
  }, [])

  if (!selectedBooking) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-muted-foreground text-sm">
        Select a booking
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    )
  }

  if (detailsError || !details) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-destructive text-sm">
        {detailsError ?? "Failed to load booking"}
      </div>
    )
  }

  if (details.status !== 0) {
    const settlement = details.settlement
    return (
      <div className="flex flex-1 flex-col min-h-0 gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden />
          <h3 className="text-sm font-medium text-foreground">Booking already paid</h3>
        </div>
        {settlement ? (
          <SettlementDetailsCard settlement={settlement} />
        ) : (
          <div className="flex-1 min-h-[120px] rounded-lg border border-dashed border-border bg-muted/20 flex items-center justify-center text-muted-foreground text-sm">
            No receipt details available.
          </div>
        )}
      </div>
    )
  }

  if (details.sessionStatus === 0) {
    return (
      <div className="flex flex-1 flex-col min-h-0 gap-3">
        <div className="flex items-center gap-2 shrink-0 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
          <CheckCircle2 className="size-5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Doctor is on leave for this session. Settlement is not allowed.
          </p>
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  if (details.sessionDateForSettle && details.sessionDateForSettle < today) {
    return (
      <div className="flex flex-1 flex-col min-h-0 gap-3">
        <div className="flex items-center gap-2 shrink-0 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
          <CheckCircle2 className="size-5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Cannot settle a booking for a past session date. Only today&apos;s sessions can be settled.
          </p>
        </div>
      </div>
    )
  }

  if (details.sessionCanSettleArrival === false) {
    return (
      <div className="flex flex-1 flex-col min-h-0 gap-3">
        <div className="flex items-center gap-2 shrink-0 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
          <CheckCircle2 className="size-5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Doctor has departed. Doctor must arrive again before settlement is allowed.
          </p>
        </div>
      </div>
    )
  }

  const amount = details.billTotal
  const showCard = settleMethod === SAVE_PAYMENT_TYPE_CREDIT_CARD
  const showSlip = settleMethod === SAVE_PAYMENT_TYPE_SLIP
  const isMixed = settleMethod === SAVE_PAYMENT_TYPE_MIXED
  const showBank = showCard || showSlip
  const mixedTotal = mixedLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)
  const mixedRemaining = amount - mixedTotal

  async function handleSettle(mixedPaymentLines?: Array<{ payment_method: number; amount: number }>) {
    if (!selectedBooking || !details) return
    setSubmitting(true)
    try {
      const result = await settleBookingAction({
        booking_id: selectedBooking.id,
        settle_method: settleMethod,
        discount: details.discount,
        bank: showBank && bankId ? { id: bankId, name: banks.find((b) => b.id === bankId)?.name } : null,
        slip_ref: showSlip ? slipRef : undefined,
        card: showCard ? card : undefined,
        payment_lines: mixedPaymentLines,
      })
      if (result.success) {
        toast({
          title: "Settled",
          description: "Payment recorded successfully.",
        })
        if (selectedSession?.id) {
          const res = await getBookingsBySession(selectedSession.id)
          if (res.success && res.data) {
            setBookings(res.data)
            const updated = res.data.find((b) => b.id === selectedBooking?.id)
            if (updated) setSelectedBooking(updated)
          }
        }
        setSettleMethod(SAVE_PAYMENT_TYPE_CASH)
        setCard("")
        setSlipRef("")
        setBankId("")
        resetMixedDialog()
        onSettleSuccess?.()
      } else {
        toast({
          title: "Error",
          description: result.message ?? result.errorCode ?? "Settle failed.",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Settle failed.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMixedSettleNow() {
    const lines = mixedLines
      .map((line) => ({
        payment_method: line.payment_method,
        amount: Math.round((Number(line.amount) || 0) * 100) / 100,
        bank: line.bank_id
          ? { id: line.bank_id, name: banks.find((b) => b.id === line.bank_id)?.name }
          : null,
        card: line.card.trim() || undefined,
        slip_ref: line.slip_ref.trim() || undefined,
      }))
    if (lines.length < 2) {
      toast({
        title: "Mixed payment lines required",
        description: "Please add at least two payment lines.",
        variant: "destructive",
      })
      return
    }
    const invalidIdx = lines.findIndex((line) => line.amount <= 0)
    if (invalidIdx >= 0) {
      toast({
        title: "Amount required",
        description: `Mixed payment line ${invalidIdx + 1} must be greater than 0.00.`,
        variant: "destructive",
      })
      return
    }
    if (Math.abs(mixedRemaining) > 0.0001) {
      toast({
        title: "Amount mismatch",
        description: "Payment line total must match the full bill amount.",
        variant: "destructive",
      })
      return
    }
    for (const [idx, line] of lines.entries()) {
      if (line.payment_method === SAVE_PAYMENT_TYPE_CREDIT_CARD) {
        if (!line.bank?.id) {
          toast({
            title: "Bank required",
            description: `Please select a bank for mixed payment line ${idx + 1} (Credit Card).`,
            variant: "destructive",
          })
          return
        }
        if (!/^\d{4}$/.test(line.card ?? "")) {
          toast({
            title: "Card reference required",
            description: `Please enter exactly 4 digits for card reference on mixed payment line ${idx + 1}.`,
            variant: "destructive",
          })
          return
        }
      }
      if (line.payment_method === SAVE_PAYMENT_TYPE_SLIP) {
        if (!line.bank?.id) {
          toast({
            title: "Bank required",
            description: `Please select a bank for mixed payment line ${idx + 1} (Slip).`,
            variant: "destructive",
          })
          return
        }
        if (!line.slip_ref?.trim()) {
          toast({
            title: "Slip reference required",
            description: `Please enter slip reference for mixed payment line ${idx + 1}.`,
            variant: "destructive",
          })
          return
        }
      }
    }
    await handleSettle(lines)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">Payment Method</label>
        <Select
          value={String(settleMethod)}
          onValueChange={(v) => {
            setSettleMethod(Number(v))
            setBankId("")
            setCard("")
            setSlipRef("")
          }}
        >
          <SelectTrigger className="w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SETTLE_METHODS.map((m) => (
              <SelectItem key={m.value} value={String(m.value)} className="text-xs">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {showCard && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Card Details</label>
          <Input
            className="text-xs"
            placeholder="Last 4 Digits"
            value={card}
            onChange={(e) => setCard(e.target.value.replace(/\D/g, "").slice(0, 4))}
            maxLength={4}
          />
        </div>
      )}
      {showSlip && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Slip Details</label>
          <Input
            className="text-xs"
            placeholder="Slip Reference"
            value={slipRef}
            onChange={(e) => setSlipRef(e.target.value)}
          />
        </div>
      )}
      {showBank && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Bank</label>
          <Select value={bankId || undefined} onValueChange={setBankId}>
            <SelectTrigger className="w-full text-xs">
              <SelectValue placeholder="Select Bank" />
            </SelectTrigger>
            <SelectContent>
              {banks.map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-xs">
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={() => {
          if (isMixed) {
            setMixedDialogOpen(true)
            return
          }
          void handleSettle()
        }}
        disabled={submitting}
      >
        {submitting ? "Settling…" : `Settle Now (${formatRs(amount)})`}
      </Button>

      <Dialog
        open={mixedDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetMixedDialog()
            return
          }
          setMixedDialogOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mixed Settlement Breakdown</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {mixedLines.map((line, idx) => (
              <div key={`settle-mixed-${idx}`} className="relative space-y-2 rounded-md border border-border/50 p-2 pr-12">
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_220px] gap-2">
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">Payment Method</p>
                      <Select
                        value={String(line.payment_method)}
                        onValueChange={(v) =>
                          setMixedLines((prev) =>
                            prev.map((row, rowIdx) =>
                              rowIdx === idx
                                ? { ...row, payment_method: Number(v), card: "", slip_ref: "" }
                                : row
                            )
                          )
                        }
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={String(SAVE_PAYMENT_TYPE_CASH)} className="text-xs">Cash</SelectItem>
                          <SelectItem value={String(SAVE_PAYMENT_TYPE_CREDIT_CARD)} className="text-xs">Credit Card</SelectItem>
                          <SelectItem value={String(SAVE_PAYMENT_TYPE_SLIP)} className="text-xs">Slip</SelectItem>
                          <SelectItem value={String(SAVE_PAYMENT_TYPE_E_WALLET)} className="text-xs">E-Wallet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-foreground text-right">Amount</p>
                      <Input
                        className="text-xs font-semibold bg-amber-50/60 border-amber-300 focus-visible:ring-amber-500 text-right tabular-nums"
                        type="text"
                        inputMode="decimal"
                        value={line.amount}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d.]/g, "")
                          if (/^\d*(\.\d{0,2})?$/.test(value)) {
                            setMixedLines((prev) =>
                              prev.map((row, rowIdx) =>
                                rowIdx === idx ? { ...row, amount: value } : row
                              )
                            )
                          }
                        }}
                        onFocus={() =>
                          setMixedLines((prev) =>
                            prev.map((row, rowIdx) => {
                              if (rowIdx !== idx) return row
                              if (/^\d+$/.test(row.amount)) {
                                return { ...row, amount: Number(row.amount).toFixed(2) }
                              }
                              return row
                            })
                          )
                        }
                        onBlur={() =>
                          setMixedLines((prev) =>
                            prev.map((row, rowIdx) => {
                              if (rowIdx !== idx) return row
                              const num = Number(row.amount)
                              if (!Number.isFinite(num)) return { ...row, amount: "" }
                              return { ...row, amount: num.toFixed(2) }
                            })
                          )
                        }
                      />
                    </div>
                </div>
                {(line.payment_method === SAVE_PAYMENT_TYPE_CREDIT_CARD ||
                  line.payment_method === SAVE_PAYMENT_TYPE_SLIP) && (
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_220px] gap-2">
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">Bank</p>
                      <Select
                        value={line.bank_id || undefined}
                        onValueChange={(v) =>
                          setMixedLines((prev) =>
                            prev.map((row, rowIdx) =>
                              rowIdx === idx ? { ...row, bank_id: v } : row
                            )
                          )
                        }
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select Bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {banks.map((b) => (
                            <SelectItem key={b.id} value={b.id} className="text-xs">
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground text-right">
                        {line.payment_method === SAVE_PAYMENT_TYPE_CREDIT_CARD
                          ? "Card Ref / Last 4"
                          : "Slip Reference"}
                      </p>
                      {line.payment_method === SAVE_PAYMENT_TYPE_CREDIT_CARD ? (
                        <Input
                          className="text-xs"
                          placeholder="Card reference / last 4"
                          value={line.card}
                          inputMode="numeric"
                          maxLength={4}
                          onChange={(e) =>
                            setMixedLines((prev) =>
                              prev.map((row, rowIdx) =>
                                rowIdx === idx
                                  ? { ...row, card: e.target.value.replace(/\D/g, "").slice(0, 4) }
                                  : row
                              )
                            )
                          }
                        />
                      ) : (
                        <Input
                          className="text-xs"
                          placeholder="Slip reference"
                          value={line.slip_ref}
                          onChange={(e) =>
                            setMixedLines((prev) =>
                              prev.map((row, rowIdx) =>
                                rowIdx === idx ? { ...row, slip_ref: e.target.value } : row
                              )
                            )
                          }
                        />
                      )}
                    </div>
                  </div>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-2 h-8 w-8 shrink-0"
                  disabled={mixedLines.length <= 2}
                  onClick={() => setMixedLines((prev) => prev.filter((_, rowIdx) => rowIdx !== idx))}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() =>
                setMixedLines((prev) => [
                  ...prev,
                  {
                    payment_method: SAVE_PAYMENT_TYPE_CASH,
                    amount: "",
                    bank_id: "",
                    card: "",
                    slip_ref: "",
                  },
                ])
              }
            >
              Add payment line
            </Button>
            <div className="rounded-md border border-border/60 p-2 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Bill</span>
                <span>{formatRs(amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Entered</span>
                <span>{formatRs(mixedTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Remaining</span>
                <span className={Math.abs(mixedRemaining) < 0.0001 ? "text-green-600" : "text-red-600"}>
                  {formatRs(mixedRemaining)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetMixedDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitting || Math.abs(mixedRemaining) > 0.0001}
              onClick={() => void handleMixedSettleNow()}
            >
              Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
