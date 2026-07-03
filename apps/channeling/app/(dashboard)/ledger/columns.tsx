"use client"

import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import type { LedgerReceiptListItem } from "@/services/ledger/list-ledger-receipts.service"
import { format } from "date-fns"
import { formatLKR } from "@/lib/format-money"
import { ReceiptNoCell } from "./receipt-no-cell"
import { LedgerRecordActions } from "./ledger-record-actions"

export function getLedgerColumns(canAdd: boolean): ColumnDef<LedgerReceiptListItem>[] {
  return [
  {
    accessorKey: "receiptNoString",
    header: "Receipt No",
    cell: ({ row }) => {
      const id = row.original.id ?? ""
      const v = row.getValue("receiptNoString") as string
      return <ReceiptNoCell id={id} receiptNoString={v} />
    },
  },
  {
    accessorKey: "methodName",
    header: "Type",
    cell: ({ row }) => {
      const v = row.getValue("methodName") as string
      return <span>{v || "—"}</span>
    },
  },
  {
    accessorKey: "locationName",
    header: "Branch",
    cell: ({ row }) => {
      const v = row.original.locationName
      return <span className="text-muted-foreground">{v || "—"}</span>
    },
  },
  {
    id: "agency",
    header: "Agency",
    cell: ({ row }) => {
      const ag = row.original
      if (!ag.agencyName) return <span className="text-muted-foreground">—</span>
      return (
        <span>
          {ag.agencyCode ? `${ag.agencyCode} - ` : ""}
          {ag.agencyName}
        </span>
      )
    },
  },
  {
    accessorKey: "amount",
    header: "Amount (LKR)",
    cell: ({ row }) => {
      const v = row.original.amount
      const num = typeof v === "number" ? v : 0
      return <span className="tabular-nums">{formatLKR(num)}</span>
    },
  },
  {
    accessorKey: "paymentMethodName",
    header: "Payment",
    cell: ({ row }) => {
      const v = row.getValue("paymentMethodName") as string
      return <span className="text-muted-foreground text-sm">{v || "—"}</span>
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => {
      const d = row.original.createdAt
      if (!d) return "—"
      try {
        return (
          <span className="text-muted-foreground text-sm">
            {format(new Date(d), "dd MMM yyyy HH:mm")}
          </span>
        )
      } catch {
        return "—"
      }
    },
  },
  {
    accessorKey: "remarks",
    header: "Remarks",
    cell: ({ row }) => {
      const v = row.original.remarks
      return (
        <span className="max-w-[180px] truncate block text-muted-foreground text-sm" title={v || ""}>
          {v || "—"}
        </span>
      )
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const r = row.original
      if (r.canceledAt) {
        return (
          <div className="text-sm space-y-0.5">
            <span className="text-amber-600 dark:text-amber-400 font-medium block">
              Canceled
              {r.cancelReason ? `: ${r.cancelReason}` : ""}
            </span>
            {r.reverseReceiptId && (
              <Link
                href={`/ledger/${r.reverseReceiptId}/edit`}
                className="text-primary hover:underline text-xs"
              >
                View reversal →
              </Link>
            )}
          </div>
        )
      }
      if (r.reversedReceiptId) {
        return (
          <Link
            href={`/ledger/${r.reversedReceiptId}/edit`}
            className="text-muted-foreground hover:text-primary text-sm hover:underline"
          >
            Reversal of original
          </Link>
        )
      }
      return <span className="text-muted-foreground">—</span>
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <LedgerRecordActions row={row} canAdd={canAdd} />
      </div>
    ),
  },
  ]
}

export const LedgerColumns = getLedgerColumns(true)
