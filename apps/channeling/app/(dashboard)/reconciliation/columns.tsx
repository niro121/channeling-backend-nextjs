"use client"

import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { formatCents } from "@/lib/format-money"
import { RECONCILIATION_STATUS } from "@/types/handover"
import type { HandoverForReconciliationList } from "@/services/reconciliation.service"

function fromUserLabel(fromUser: HandoverForReconciliationList["fromUser"] | null | undefined): string {
  if (!fromUser) return "—"
  const name = fromUser.name ?? "—"
  return fromUser.staff?.code ? `${name} (${fromUser.staff.code})` : name
}

function reconciliationStatusLabel(status: number | null): string {
  if (status == null) return "Pending"
  switch (status) {
    case RECONCILIATION_STATUS.PENDING:
      return "Pending"
    case RECONCILIATION_STATUS.IN_RECONCILIATION:
      return "In reconciliation"
    case RECONCILIATION_STATUS.RECONCILED_APPROVED:
      return "Reconciled"
    case RECONCILIATION_STATUS.RECONCILED_REJECTED:
      return "Rejected"
    default:
      return "Pending"
  }
}

export type ReconciliationListRow = HandoverForReconciliationList

export const ReconciliationColumns: ColumnDef<ReconciliationListRow>[] = [
  {
    accessorKey: "createdAt",
    header: "Handover date",
    cell: ({ row }) => {
      const d = row.original.createdAt
      return (
        <Link
          href={`/reconciliation/${row.original.id}`}
          className="text-primary hover:underline underline-offset-2"
        >
          {d ? new Date(d).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "—"}
        </Link>
      )
    },
  },
  {
    id: "fromUser",
    header: "From",
    cell: ({ row }) => (
      <span className="truncate block max-w-40" title={fromUserLabel(row.original.fromUser)}>
        {fromUserLabel(row.original.fromUser)}
      </span>
    ),
  },
  {
    id: "toUser",
    header: "To",
    cell: ({ row }) => (
      <span className="truncate block max-w-40" title={row.original.toUser?.name ?? ""}>
        {row.original.toUser?.name ?? "—"}
      </span>
    ),
  },
  {
    id: "reconciliationStatus",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.reconciliationStatus ?? RECONCILIATION_STATUS.PENDING
      const label = reconciliationStatusLabel(status)
      const variant = status === RECONCILIATION_STATUS.IN_RECONCILIATION ? "secondary" : status === RECONCILIATION_STATUS.RECONCILED_REJECTED ? "destructive" : "outline"
      return <Badge variant={variant}>{label}</Badge>
    },
  },
  {
    accessorKey: "totalNonCashCents",
    header: "Non-cash (LKR)",
    cell: ({ row }) => formatCents(row.original.totalNonCashCents),
  },
  {
    id: "cardCents",
    header: "Card",
    cell: ({ row }) => formatCents(row.original.cardCents),
  },
  {
    id: "slipCents",
    header: "Slip",
    cell: ({ row }) => formatCents(row.original.slipCents),
  },
  {
    id: "checkCents",
    header: "Check",
    cell: ({ row }) => formatCents(row.original.checkCents),
  },
  {
    id: "eWalletCents",
    header: "E-Wallet",
    cell: ({ row }) => formatCents(row.original.eWalletCents),
  },
]
