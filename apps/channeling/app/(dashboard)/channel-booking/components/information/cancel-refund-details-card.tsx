"use client"

import type { CancelOrRefundDetailsView, ReceiptRowView } from "@/services/channel-booking/get-booking-details.service"
import { Ban } from "lucide-react"

function formatRs(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

export function CancelRefundDetailsCard({ details }: { details: CancelOrRefundDetailsView }) {
  const hasRefund = details.refundAmount !== 0 || details.refundReceipts.length > 0
  return (
    <div className="flex flex-1 flex-col min-h-0 rounded-lg border border-border bg-muted/10">
      <div className="flex items-center gap-2 p-3 border-b border-border/60">
        <Ban className="size-5 text-red-600 dark:text-red-400 shrink-0" aria-hidden />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Cancel / refund details
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {details.refundAmount !== 0 && (
          <Row label="Refund amount" value={formatRs(Math.abs(details.refundAmount))} highlight />
        )}
        {details.refundReceipts.length > 0 ? (
          <>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground pt-1">
              Refund receipt(s)
            </div>
            {details.refundReceipts.map((r) => (
              <RefundReceiptRow key={r.id} row={r} />
            ))}
          </>
        ) : null}
        {!hasRefund && (
          <p className="text-xs text-muted-foreground py-1">Canceled with no refund.</p>
        )}
      </div>
    </div>
  )
}

function RefundReceiptRow({ row }: { row: ReceiptRowView }) {
  return (
    <div className="rounded border border-border/40 bg-background/50 p-2 space-y-0.5 text-xs">
      <Row label="Receipt No." value={row.receiptNoString} />
      <Row label="Payment by" value={row.paymentMethodName} />
      <Row label="Amount" value={formatRs(row.amount)} highlight />
      <Row label="Processed" value={row.processedBy} />
      {row.remarks ? <Row label="Remarks" value={row.remarks} /> : null}
    </div>
  )
}
