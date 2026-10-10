"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { ReceiptListItem } from "@/services/receipt-manager/get-receipt-list.service";
import { getReceiptMethodLabel } from "@/services/receipt-manager/receipt-method-labels";
import { format } from "date-fns";
import { formatLKR } from "@/lib/format-money";
import { PAYMENT_METHOD_NAMES } from "@/types/receipt";
import { ReceiptManagerRecordActions } from "./record-actions";
import { useReceiptManagerView } from "./receipt-manager-view-context";

export const ReceiptManagerColumns: ColumnDef<ReceiptListItem>[] = [
  {
    accessorKey: "receiptNoString",
    header: "Receipt No",
    cell: ({ row }) => {
      const openView = useReceiptManagerView()?.openView;
      const id = row.original.id;
      const label = row.original.receiptNoString || "—";
      if (openView) {
        return (
          <button
            type="button"
            onClick={() => openView(id)}
            className="font-medium text-primary hover:underline text-left"
          >
            {label}
          </button>
        );
      }
      return <span className="font-medium">{label}</span>;
    },
  },
  {
    accessorKey: "method",
    header: "Method",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {getReceiptMethodLabel(row.original.method)}
      </span>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.type === 1 ? "Debit" : "Credit"}
      </span>
    ),
  },
  {
    id: "paymentMethod",
    header: "Payment Method",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {PAYMENT_METHOD_NAMES[row.original.paymentMethod] ?? row.original.paymentMethod ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="tabular-nums">{formatLKR(row.original.amount)}</span>
    ),
  },
  {
    accessorKey: "whd",
    header: "WHT",
    cell: ({ row }) =>
      row.original.whd > 0 ? (
        <span className="tabular-nums text-muted-foreground">{formatLKR(row.original.whd)}</span>
      ) : (
        "—"
      ),
  },
  {
    accessorKey: "locationName",
    header: "Location",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{row.original.locationName ?? "—"}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => {
      const d = row.original.createdAt;
      if (!d) return "—";
      try {
        return (
          <span className="text-muted-foreground text-sm">
            {format(new Date(d), "dd MMM yyyy HH:mm")}
          </span>
        );
      } catch {
        return "—";
      }
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <ReceiptManagerRecordActions row={row} />
      </div>
    ),
  },
];
