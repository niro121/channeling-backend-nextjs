"use client"

import { useEffect, useState } from "react"
import { getBookingDetails } from "@/app/actions/channel-booking"
import type {
  BookingDetailsView,
  ReceiptRowView,
} from "@/services/channel-booking/get-booking-details.service"
import { useChannelBooking } from "../../context/channel-booking-context"
import { ChevronDown, ChevronRight, Printer } from "lucide-react"
import { cn } from "@/lib/utils"

function formatRs(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string
  value: string | number
  highlight?: boolean
}) {
  return (
    <div
      className={`flex justify-between gap-3 py-1.5 border-b border-border/40 last:border-0 px-1 -mx-1 rounded ${highlight ? "bg-primary/10" : ""}`}
    >
      <span
        className={`text-[11px] shrink-0 ${highlight ? "font-semibold text-foreground" : "text-muted-foreground"}`}
      >
        {label}
      </span>
      <span
        className={`text-xs text-right break-words min-w-0 ${highlight ? "text-destructive font-semibold" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  )
}

function Section({
  title,
  children,
  muted,
}: {
  title: string
  children: React.ReactNode
  muted?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <h3
        className={`text-[10px] font-medium uppercase tracking-wider ${muted ? "text-muted-foreground/80" : "text-muted-foreground"}`}
      >
        {title}
      </h3>
      <div
        className={`rounded-md border p-2 space-y-0 ${muted ? "bg-muted/5 border-border/40" : "bg-muted/10 border-border/60"}`}
      >
        {children}
      </div>
    </div>
  )
}

export function BookingTab() {
  const { selectedBooking, bookingDetailsRefreshKey } = useChannelBooking()
  const [details, setDetails] = useState<BookingDetailsView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discountExpanded, setDiscountExpanded] = useState(false)
  const [agentExpanded, setAgentExpanded] = useState(false)
  const [otherExpanded, setOtherExpanded] = useState(false)
  const [receiptsExpanded, setReceiptsExpanded] = useState(false)

  useEffect(() => {
    if (!selectedBooking?.id) {
      setDetails(null)
      setError(null)
      setDiscountExpanded(false)
      setAgentExpanded(false)
      setOtherExpanded(false)
      setReceiptsExpanded(false)
      return
    }
    setLoading(true)
    setError(null)
    setDiscountExpanded(false)
    setAgentExpanded(false)
    setOtherExpanded(false)
    setReceiptsExpanded(false)
    getBookingDetails(selectedBooking.id)
      .then((res) => {
        if (res.success && res.data) {
          setDetails(res.data)
          setError(null)
        } else {
          setDetails(null)
          setError(res.message ?? "Failed to load")
        }
      })
      .finally(() => setLoading(false))
  }, [selectedBooking?.id, bookingDetailsRefreshKey])

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

  if (error || !details) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[120px] flex items-center justify-center text-destructive text-sm">
        {error ?? "Failed to load booking"}
      </div>
    )
  }

  const pendingPayment = details.status === 0

  return (
    <div className="space-y-3">
      {pendingPayment && (
        <div className="rounded-md border border-amber-200/70 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 text-amber-800 dark:text-amber-200 px-2 py-1 text-xs font-medium">
          Pending payment
        </div>
      )}
      {/* Primary: Patient, Appointment, Billing */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Section title="Patient">
          <Row label="Name" value={details.name} />
          <Row label="Sex" value={details.patientSex ? details.patientSex.charAt(0).toUpperCase() + details.patientSex.slice(1).toLowerCase() : "—"} />
          <Row label="Tel" value={details.phone} />
          <Row label="Area" value={details.area} />
        </Section>
        <Section title="Appointment">
          <Row label="Consultant" value={details.consultant} />
          <Row label="Appo. No" value={details.appointmentNo} highlight />
          <Row label="Date" value={details.appointmentDate} />
          <Row label="Time" value={details.appointmentTime} />
          <Row label="Method" value={details.bookingMethod} />
        </Section>
        <Section title="Billing">
          <Row label="Bill No" value={details.billNo} />
          <Row label="Bill Total" value={formatRs(details.billTotal)} highlight />
          <Row label="Sub Total" value={formatRs(details.billSubTotal)} />
          <Row label="Discount" value={formatRs(details.discount)} />
        </Section>
      </div>

      {/* Discount: compact summary with expand for details */}
      {details.discountInfo && (details.discountInfo.total > 0 || details.discountInfo.manualSchemeName || details.discountInfo.autoSchemeName) && (
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
            Discount
          </h3>
          <div className="rounded-md border border-border/40 bg-muted/5 overflow-hidden">
            <button
              type="button"
              onClick={() => setDiscountExpanded((e) => !e)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-left",
                "hover:bg-muted/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-t-md"
              )}
            >
              {discountExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="text-[11px] text-muted-foreground shrink-0">Total</span>
              <span className="text-xs font-medium text-foreground min-w-0 truncate">
                {formatRs(details.discountInfo.total)}
              </span>
              {(details.discountInfo.autoSchemeName || details.discountInfo.manualSchemeName) && (
                <span className="text-[10px] text-muted-foreground truncate ml-auto">
                  {[details.discountInfo.autoSchemeName, details.discountInfo.manualSchemeName]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </button>
            {discountExpanded && (
              <div className="border-t border-border/40 px-2 py-1.5 space-y-0 bg-muted/5">
                {details.discountInfo.autoSchemeName && (
                  <Row label="Auto scheme" value={details.discountInfo.autoSchemeName} />
                )}
                {details.discountInfo.manualSchemeName && (
                  <Row label="Manual scheme" value={details.discountInfo.manualSchemeName} />
                )}
                {(details.discountInfo.hospitalFeeDiscount > 0 ||
                  details.discountInfo.professionalFeeDiscount > 0 ||
                  details.discountInfo.otherDiscount > 0) && (
                  <>
                    {details.discountInfo.hospitalFeeDiscount > 0 && (
                      <Row label="Hospital fee" value={formatRs(details.discountInfo.hospitalFeeDiscount)} />
                    )}
                    {details.discountInfo.professionalFeeDiscount > 0 && (
                      <Row label="Professional fee" value={formatRs(details.discountInfo.professionalFeeDiscount)} />
                    )}
                    {details.discountInfo.otherDiscount > 0 && (
                      <Row label="Other" value={formatRs(details.discountInfo.otherDiscount)} />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Agent: compact summary with expand for details (when booking is via Agent) */}
      {details.agentInfo && (
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
            Agent
          </h3>
          <div className="rounded-md border border-border/40 bg-muted/5 overflow-hidden">
            <button
              type="button"
              onClick={() => setAgentExpanded((e) => !e)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-left",
                "hover:bg-muted/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-t-md"
              )}
            >
              {agentExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="text-[11px] text-muted-foreground shrink-0">Agent</span>
              <span className="text-xs font-medium text-foreground min-w-0 truncate">
                {details.agentInfo.agencyCode
                  ? `${details.agentInfo.agencyName} (${details.agentInfo.agencyCode})`
                  : details.agentInfo.agencyName}
              </span>
              {!agentExpanded && details.agentInfo.agencyRef && (
                <span className="text-[10px] text-muted-foreground truncate ml-auto">
                  REF: {details.agentInfo.agencyRef}
                </span>
              )}
            </button>
            {agentExpanded && (
              <div className="border-t border-border/40 px-2 py-1.5 space-y-0 bg-muted/5">
                <Row label="REF NO." value={details.agentInfo.agencyRef || "—"} />
                {details.agentInfo.bookNumber && (
                  <Row label="Book No." value={details.agentInfo.bookNumber} />
                )}
                <Row
                  label="Agent"
                  value={details.agentInfo.agencyCode ? `${details.agentInfo.agencyName} (${details.agentInfo.agencyCode})` : details.agentInfo.agencyName}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Other: compact summary with expand for details */}
      <div className="space-y-1.5">
        <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
          Other
        </h3>
        <div className="rounded-md border border-border/40 bg-muted/5 overflow-hidden">
          <button
            type="button"
            onClick={() => setOtherExpanded((e) => !e)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-left",
              "hover:bg-muted/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-t-md"
            )}
          >
            {otherExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="text-[11px] text-muted-foreground shrink-0">Remark · Foreigner · Agent · Referred · Billed by</span>
            {!otherExpanded && (
              <span className="text-[10px] text-muted-foreground truncate ml-auto">
                {details.remark?.trim() ? `${details.remark.slice(0, 20)}${details.remark.length > 20 ? "…" : ""}` : details.foreigner ? "Foreigner" : details.agentRef !== "-" ? "Agent" : "—"}
              </span>
            )}
          </button>
          {otherExpanded && (
            <div className="border-t border-border/40 px-2 py-1.5 space-y-0 bg-muted/5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0">
                <Row label="Remark" value={details.remark || "—"} />
                <Row label="Foreigner" value={details.foreigner ? "Yes" : "No"} />
                <Row label="Agent Ref." value={details.agentRef} />
                <Row label="Referred By" value={details.referredBy || "—"} />
              </div>
              <Row label="Billed By" value={details.billedBy} />
            </div>
          )}
        </div>
      </div>

      {/* Receipts: compact summary with expand for cards */}
      {details.receipts?.length ? (
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
            Receipts
          </h3>
          <div className="rounded-md border border-border/40 bg-muted/5 overflow-hidden">
            <button
              type="button"
              onClick={() => setReceiptsExpanded((e) => !e)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-left",
                "hover:bg-muted/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-t-md"
              )}
            >
              {receiptsExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="text-[11px] text-muted-foreground shrink-0">
                {details.receipts.length} receipt{details.receipts.length !== 1 ? "s" : ""}
              </span>
              {!receiptsExpanded && (
                <span className="text-[10px] text-muted-foreground truncate ml-auto">
                  {details.receipts.map((r) => `${r.type}: ${r.receiptNoString}`).join(" · ")}
                </span>
              )}
            </button>
            {receiptsExpanded && (
              <div className="border-t border-border/40 p-2 bg-muted/5">
                <div className="grid grid-cols-2 gap-2">
                  {details.receipts.map((r) => (
                    <ReceiptCard key={r.id} row={r} formatRs={formatRs} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ReceiptCard({
  row,
  formatRs,
}: {
  row: ReceiptRowView
  formatRs: (n: number) => string
}) {
  const isRefund = row.type === "Refund"
  const cardClass = isRefund
    ? "rounded border border-red-300 dark:border-red-800/60 bg-red-50/80 dark:bg-red-950/30"
    : "rounded border border-border/40 bg-background/60"
  const typeClass = isRefund ? "text-[10px] font-medium text-red-700 dark:text-red-400" : "text-[10px] font-medium text-muted-foreground"
  const amountClass = isRefund ? "text-[11px] font-semibold text-red-700 dark:text-red-400" : "text-[11px] font-semibold text-foreground"

  return (
    <div className={`min-w-0 p-1.5 ${cardClass}`}>
      <div className="flex items-start justify-between gap-1">
        <span className={typeClass}>{row.type}</span>
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-foreground p-0.5 -m-0.5"
          title="Print receipt"
          aria-label="Print receipt"
        >
          <Printer className="size-3" />
        </button>
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground truncate" title={row.receiptNoString}>
        {row.receiptNoString}
      </div>
      <div className={`mt-0.5 ${amountClass}`}>{formatRs(row.amount)}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{row.paymentMethodName}</div>
      {row.remarks ? (
        <div className="mt-0.5 text-[10px] text-muted-foreground truncate" title={row.remarks}>
          {row.remarks}
        </div>
      ) : null}
    </div>
  )
}
