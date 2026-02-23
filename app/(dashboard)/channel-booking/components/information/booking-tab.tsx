"use client"

import { useEffect, useState } from "react"
import { getBookingDetails, getReceiptDetails } from "@/app/actions/channel-booking"
import type {
  BookingDetailsView,
  ReceiptRowView,
} from "@/services/channel-booking/get-booking-details.service"
import { useChannelBooking } from "../../context/channel-booking-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronDown, ChevronRight, ExternalLink, Loader2, Printer } from "lucide-react"
import { cn } from "@/lib/utils"

function formatRs(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatAppointmentNo(value: string | number): string {
  const s = String(value).trim()
  const n = parseInt(s, 10)
  if (Number.isNaN(n) || s === "") return s
  return String(n).padStart(2, "0")
}

function Row({
  label,
  value,
  highlight,
  valueClassName,
}: {
  label: string
  value: string | number
  highlight?: boolean
  valueClassName?: string
}) {
  return (
    <div
      className={cn(
        "flex justify-between gap-2 py-1 border-b border-slate-200/90 last:border-0 px-1 -mx-1 dark:border-slate-600/80",
        highlight && "border-l-2 border-l-primary bg-primary/5 -ml-0.5 pl-1.5"
      )}
    >
      <span
        className={cn(
          "text-[11px] shrink-0",
          highlight ? "font-medium text-foreground" : "text-slate-600 dark:text-slate-400"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-xs text-right break-words min-w-0",
          highlight ? "font-semibold text-foreground" : "text-foreground",
          valueClassName
        )}
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
  trailing,
}: {
  title: string
  children: React.ReactNode
  muted?: boolean
  trailing?: React.ReactNode
}) {
  return (
    <div className="space-y-1 flex flex-col min-h-0">
      <h3
        className={cn(
          "flex items-center gap-2 flex-wrap shrink-0",
          "text-[10px] font-semibold uppercase tracking-wider",
          "text-slate-600 dark:text-slate-400"
        )}
      >
        {title}
        {trailing}
      </h3>
      <div
        className={cn(
          "rounded-lg border p-1.5 space-y-0 flex-1 min-h-0",
          muted
            ? "bg-slate-50/90 border-slate-200 dark:bg-slate-900/30 dark:border-slate-700"
            : "bg-white border-slate-200 dark:bg-slate-900/50 dark:border-slate-700 shadow-sm"
        )}
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
  const [billingExpanded, setBillingExpanded] = useState(false)
  const [agentExpanded, setAgentExpanded] = useState(false)
  const [referredExpanded, setReferredExpanded] = useState(false)
  const [movedExpanded, setMovedExpanded] = useState(false)
  const [otherExpanded, setOtherExpanded] = useState(false)
  const [receiptsExpanded, setReceiptsExpanded] = useState(false)
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRowView | null>(null)

  useEffect(() => {
    if (!selectedBooking?.id) {
      setDetails(null)
      setError(null)
      setDiscountExpanded(false)
      setBillingExpanded(false)
      setAgentExpanded(false)
      setReferredExpanded(false)
      setMovedExpanded(false)
      setOtherExpanded(false)
      setReceiptsExpanded(false)
      setSelectedReceipt(null)
      return
    }
    setLoading(true)
    setError(null)
    setDiscountExpanded(false)
    setBillingExpanded(false)
    setAgentExpanded(false)
    setReferredExpanded(false)
    setMovedExpanded(false)
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
      <div className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 min-h-[120px] flex items-center justify-center text-slate-600 dark:text-slate-400 text-sm">
        Select a booking
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 min-h-[120px] flex items-center justify-center text-slate-600 dark:text-slate-400 text-sm">
        Loading…
      </div>
    )
  }

  if (error || !details) {
    return (
      <div className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 min-h-[120px] flex items-center justify-center text-destructive text-sm">
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
      {/* Primary: Patient, Appointment — compact, equal-height panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-stretch">
        <Section title="Patient">
          <Row label="Name" value={details.name} />
          <Row label="Sex" value={details.patientSex ? details.patientSex.charAt(0).toUpperCase() + details.patientSex.slice(1).toLowerCase() : "—"} />
          <Row label="Tel" value={details.phone} />
          <Row label="Area" value={details.area} />
          <Row label="Foreigner" value={details.foreigner ? "Yes" : "No"} />
        </Section>
        <Section
          title="Appointment"
          trailing={
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                "bg-primary/15 text-primary border border-primary/30",
                "dark:bg-primary/20 dark:border-primary/40"
              )}
            >
              {details.bookingMethod}
            </span>
          }
        >
          <Row label="Consultant" value={details.consultant} highlight />
          <Row
            label="Appo. No"
            value={formatAppointmentNo(details.appointmentNo)}
            highlight
            valueClassName="text-destructive"
          />
          <Row label="Date" value={details.appointmentDate} />
          <Row label="Time" value={details.appointmentTime} />
        </Section>
      </div>

      {/* Billing: compact summary with expand for details (same style as Discount) */}
      <div className="space-y-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Billing
        </h3>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/30 overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setBillingExpanded((e) => !e)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-left",
              "hover:bg-slate-100/80 dark:hover:bg-slate-800/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded-t-lg"
            )}
          >
            {billingExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
            )}
            <span className="text-[11px] text-slate-600 dark:text-slate-400 shrink-0">Bill No</span>
            <span className="text-xs font-medium text-foreground min-w-0 truncate">
              {details.billNo}
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 shrink-0 ml-auto">Total</span>
            <span className="text-xs font-semibold text-foreground">
              {formatRs(details.billTotal)}
            </span>
          </button>
          {billingExpanded && (
            <div className="border-t border-slate-200 dark:border-slate-700 px-2 py-1.5 space-y-0 bg-slate-50/80 dark:bg-slate-900/20">
              <Row label="Bill No" value={details.billNo} />
              <Row label="Sub Total" value={formatRs(details.billSubTotal)} />
              <Row label="Discount" value={formatRs(details.discount)} />
              <Row label="Bill Total" value={formatRs(details.billTotal)} highlight />
              <Row label="Billed By" value={details.billedBy} />
            </div>
          )}
        </div>
      </div>

      {/* Discount: compact summary with expand for details */}
      {details.discountInfo && (details.discountInfo.total > 0 || details.discountInfo.manualSchemeName || details.discountInfo.autoSchemeName) && (
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Discount
          </h3>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/30 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setDiscountExpanded((e) => !e)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-left",
                "hover:bg-slate-100/80 dark:hover:bg-slate-800/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded-t-lg"
              )}
            >
              {discountExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
              )}
              <span className="text-[11px] text-slate-600 dark:text-slate-400 shrink-0">Total</span>
              <span className="text-xs font-medium text-foreground min-w-0 truncate">
                {formatRs(details.discountInfo.total)}
              </span>
              {(details.discountInfo.autoSchemeName || details.discountInfo.manualSchemeName) && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate ml-auto">
                  {[details.discountInfo.autoSchemeName, details.discountInfo.manualSchemeName]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </button>
            {discountExpanded && (
              <div className="border-t border-slate-200 dark:border-slate-700 px-2 py-1.5 space-y-0 bg-slate-50/80 dark:bg-slate-900/20">
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
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Agent
          </h3>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/30 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setAgentExpanded((e) => !e)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-left",
                "hover:bg-slate-100/80 dark:hover:bg-slate-800/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded-t-lg"
              )}
            >
              {agentExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
              )}
              <span className="text-[11px] text-slate-600 dark:text-slate-400 shrink-0">Agent</span>
              <span className="text-xs font-medium text-foreground min-w-0 truncate">
                {details.agentInfo.agencyCode
                  ? `${details.agentInfo.agencyName} (${details.agentInfo.agencyCode})`
                  : details.agentInfo.agencyName}
              </span>
              {!agentExpanded && details.agentInfo.agencyRef && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate ml-auto">
                  REF: {details.agentInfo.agencyRef}
                </span>
              )}
            </button>
            {agentExpanded && (
              <div className="border-t border-slate-200 dark:border-slate-700 px-2 py-1.5 space-y-0 bg-slate-50/80 dark:bg-slate-900/20">
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

      {/* Referred: compact summary with expand for details (when booking has referred doctor/agency/staff) */}
      {(details.referredDoctor || details.referredAgency || details.referredStaff) && (
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Referred
          </h3>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/30 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setReferredExpanded((e) => !e)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-left",
                "hover:bg-slate-100/80 dark:hover:bg-slate-800/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded-t-lg"
              )}
            >
              {referredExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
              )}
              <span className="text-[11px] text-slate-600 dark:text-slate-400 shrink-0">Referred</span>
              {!referredExpanded && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate ml-auto">
                  {details.referredBy}
                </span>
              )}
            </button>
            {referredExpanded && (
              <div className="border-t border-slate-200 dark:border-slate-700 px-2 py-1.5 space-y-0 bg-slate-50/80 dark:bg-slate-900/20">
                {details.referredDoctor != null && details.referredDoctor !== "" && (
                  <Row label="Referred Doctor" value={details.referredDoctor} />
                )}
                {details.referredAgency != null && details.referredAgency !== "" && (
                  <Row label="Referred Agency" value={details.referredAgency} />
                )}
                {details.referredStaff != null && details.referredStaff !== "" && (
                  <Row label="Referred Staff" value={details.referredStaff} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Moved: only when booking was transferred */}
      {details.movedAt != null && (
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Moved
          </h3>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/30 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setMovedExpanded((e) => !e)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-left",
                "hover:bg-slate-100/80 dark:hover:bg-slate-800/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded-t-lg"
              )}
            >
              {movedExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
              )}
              <span className="text-[11px] text-slate-600 dark:text-slate-400 shrink-0">Transfer details</span>
              {!movedExpanded && details.movedFrom && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate ml-auto">
                  From {details.movedFrom}
                </span>
              )}
            </button>
            {movedExpanded && (
              <div className="border-t border-slate-200 dark:border-slate-700 px-2 py-1.5 space-y-0 bg-slate-50/80 dark:bg-slate-900/20">
                {details.movedFromSession != null ? (
                  <>
                    <Row label="Moved from session" value={details.movedFromSession.summary} />
                    <Row label="Session doctor" value={details.movedFromSession.doctorName} />
                    <Row label="Session date" value={details.movedFromSession.date} />
                    <Row label="Session time" value={details.movedFromSession.time} />
                  </>
                ) : (
                  details.movedFrom != null &&
                  details.movedFrom !== "" && (
                    <Row label="Moved from" value={details.movedFrom} />
                  )
                )}
                {details.movedBy != null && details.movedBy !== "" && (
                  <Row label="Moved by" value={details.movedBy} />
                )}
                <Row
                  label="Moved at"
                  value={
                    details.movedAt
                      ? new Date(details.movedAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "—"
                  }
                />
                {details.movedRemarks != null && details.movedRemarks !== "" && (
                  <Row label="Transfer remarks" value={details.movedRemarks} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Other: compact summary with expand for details */}
      <div className="space-y-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Other
        </h3>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/30 overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setOtherExpanded((e) => !e)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-left",
              "hover:bg-slate-100/80 dark:hover:bg-slate-800/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded-t-lg"
            )}
          >
            {otherExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
            )}
            <span className="text-[11px] text-slate-600 dark:text-slate-400 shrink-0">Remark · Referred</span>
            {!otherExpanded && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate ml-auto">
                {details.remark?.trim()
                  ? `${details.remark.slice(0, 20)}${details.remark.length > 20 ? "…" : ""}`
                  : details.referredBy
                    ? "Referred"
                    : details.foreigner
                      ? "Foreigner"
                      : details.agentRef !== "-"
                        ? "Agent"
                        : "—"}
              </span>
            )}
          </button>
          {otherExpanded && (
            <div className="border-t border-slate-200 dark:border-slate-700 px-2 py-1.5 space-y-0 bg-slate-50/80 dark:bg-slate-900/20">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0">
                <Row label="Remark" value={details.remark || "—"} />
                {!details.referredDoctor && !details.referredAgency && !details.referredStaff && (
                  <Row label="Referred By" value="—" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Receipts: compact summary with expand for cards */}
      {details.receipts?.length ? (
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Receipts
          </h3>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/30 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setReceiptsExpanded((e) => !e)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-left",
                "hover:bg-slate-100/80 dark:hover:bg-slate-800/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded-t-lg"
              )}
            >
              {receiptsExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
              )}
              <span className="text-[11px] text-slate-600 dark:text-slate-400 shrink-0">
                {details.receipts.length} receipt{details.receipts.length !== 1 ? "s" : ""}
              </span>
              {!receiptsExpanded && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate ml-auto">
                  {details.receipts.map((r) => `${r.type}: ${r.receiptNoString}`).join(" · ")}
                </span>
              )}
            </button>
            {receiptsExpanded && (
              <div className="border-t border-slate-200 dark:border-slate-700 p-2 bg-slate-50/80 dark:bg-slate-900/20">
                <div className="grid grid-cols-2 gap-2">
                  {details.receipts.map((r) => (
                    <ReceiptCard
                      key={r.id}
                      row={r}
                      formatRs={formatRs}
                      onViewDetails={() => {
                        setSelectedReceipt(r)
                        setReceiptDialogOpen(true)
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <ReceiptViewDialog
        receipt={selectedReceipt}
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        formatRs={formatRs}
      />
    </div>
  )
}

function ReceiptViewDialog({
  receipt,
  open,
  onOpenChange,
  formatRs,
}: {
  receipt: ReceiptRowView | null
  open: boolean
  onOpenChange: (open: boolean) => void
  formatRs: (n: number) => string
}) {
  const [details, setDetails] = useState<Awaited<ReturnType<typeof getReceiptDetails>>["data"] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !receipt?.id) {
      setDetails(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getReceiptDetails(receipt.id)
      .then((res) => {
        if (cancelled) return
        setLoading(false)
        if (res.success && res.data) setDetails(res.data)
        else setError(res.message ?? "Failed to load receipt details")
      })
      .catch((e) => {
        if (cancelled) return
        setLoading(false)
        setError(e instanceof Error ? e.message : "Failed to load receipt details")
      })
    return () => {
      cancelled = true
    }
  }, [open, receipt?.id])

  if (!receipt) return null

  const createdAtStr = details
    ? new Date(details.createdAt).toLocaleString("en-CA", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/60">
          <DialogTitle className="text-sm font-semibold tracking-tight">
            Receipt Details
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4 min-h-[120px]">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-xs">Loading receipt details…</span>
            </div>
          )}
          {error && !loading && (
            <p className="text-sm text-destructive py-4">{error}</p>
          )}
          {details && !loading && (
            <div className="space-y-1">
              <DetailRow label="Receipt No" value={details.receiptNoString} />
              <DetailRow label="Type" value={details.type} />
              <DetailRow label="Payment method" value={details.paymentMethodName} />
              <DetailRow label="Amount" value={formatRs(details.amount)} highlight />
              {details.bank ? (
                <DetailRow label="Bank" value={details.bank} />
              ) : null}
              {details.cardReference ? (
                <DetailRow label="Card reference" value={details.cardReference} />
              ) : null}
              {details.slipReference ? (
                <DetailRow label="Slip reference" value={details.slipReference} />
              ) : null}
              <DetailRow label="Processed by" value={details.processedBy} />
              <DetailRow label="Created" value={createdAtStr} />
              {details.remarks ? (
                <DetailRow label="Remarks" value={details.remarks} />
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DetailRow({
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
      className={cn(
        "flex justify-between gap-4 py-1.5 border-b border-border/40 last:border-0",
        highlight && "bg-primary/5 -mx-1 px-2 rounded"
      )}
    >
      <dt className="text-xs text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-xs text-foreground font-medium text-right break-words">
        {value}
      </dd>
    </div>
  )
}

function ReceiptCard({
  row,
  formatRs,
  onViewDetails,
}: {
  row: ReceiptRowView
  formatRs: (n: number) => string
  onViewDetails: () => void
}) {
  const isRefund = row.type === "Refund"
  const cardClass = isRefund
    ? "rounded-lg border border-red-300 dark:border-red-800/60 bg-red-50/80 dark:bg-red-950/30"
    : "rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50"
  const typeClass = isRefund ? "text-[10px] font-medium text-red-700 dark:text-red-400" : "text-[10px] font-medium text-slate-600 dark:text-slate-400"
  const amountClass = isRefund ? "text-[11px] font-semibold text-red-700 dark:text-red-400" : "text-[11px] font-semibold text-foreground"

  return (
    <div className={`min-w-0 p-1.5 ${cardClass}`}>
      <div className="flex items-start justify-between gap-1">
        <span className={typeClass}>{row.type}</span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onViewDetails}
            className="text-[10px] font-medium text-primary hover:underline flex items-center gap-0.5 p-0.5 -m-0.5"
            title="View receipt details"
          >
            <ExternalLink className="size-3" />
            Details
          </button>
          <button
            type="button"
            className="text-slate-500 hover:text-foreground p-0.5 -m-0.5"
            title="Print receipt"
            aria-label="Print receipt"
          >
            <Printer className="size-3" />
          </button>
        </div>
      </div>
      <div className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-400 truncate" title={row.receiptNoString}>
        {row.receiptNoString}
      </div>
      <div className={`mt-0.5 ${amountClass}`}>{formatRs(row.amount)}</div>
      <div className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-400">{row.paymentMethodName}</div>
      {row.remarks ? (
        <div className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-400 truncate" title={row.remarks}>
          {row.remarks}
        </div>
      ) : null}
    </div>
  )
}
