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
import type { ChannelBookingBankOption } from "@/services/channel-booking/get-banks.service"
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
import { CheckCircle2, Receipt } from "lucide-react"
import { SAVE_PAYMENT_TYPE_CASH, SAVE_PAYMENT_TYPE_CREDIT_CARD, SAVE_PAYMENT_TYPE_SLIP } from "@/types/save-booking"

const SETTLE_METHODS = [
  { value: SAVE_PAYMENT_TYPE_CASH, label: "Cash" },
  { value: SAVE_PAYMENT_TYPE_CREDIT_CARD, label: "Credit Card" },
  { value: SAVE_PAYMENT_TYPE_SLIP, label: "Slip" },
] as const

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

  const amount = details.billTotal
  const showCard = settleMethod === SAVE_PAYMENT_TYPE_CREDIT_CARD
  const showSlip = settleMethod === SAVE_PAYMENT_TYPE_SLIP
  const showBank = showCard || showSlip

  async function handleSettle() {
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
        onClick={handleSettle}
        disabled={submitting}
      >
        {submitting ? "Settling…" : `Settle Now (${formatRs(amount)})`}
      </Button>
    </div>
  )
}
