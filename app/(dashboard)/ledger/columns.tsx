"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { LedgerReceiptListItem } from "@/services/ledger/list-ledger-receipts.service"
import { format } from "date-fns"
import { ReceiptNoCell } from "./receipt-no-cell"
import { LedgerRecordActions } from "./ledger-record-actions"

export const LedgerColumns: ColumnDef<LedgerReceiptListItem>[] = [
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
      return <span className="tabular-nums">{(num / 1).toLocaleString()}</span>
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
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <LedgerRecordActions row={row} />
      </div>
    ),
  },
]
