"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { DoctorPaymentListItem } from "@/services/doctor-payment/get-doctor-payment-list.service";
import { format } from "date-fns";
import { formatLKR } from "@/lib/format-money";
import { PAYMENT_METHOD_NAMES } from "@/types/receipt";
import { DoctorPaymentRecordActions } from "./record-actions";

export const DoctorPaymentColumns: ColumnDef<DoctorPaymentListItem>[] = [
  {
    accessorKey: "receiptNoString",
    header: "Payment Receipt",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.receiptNoString || "—"}</span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const canceled = row.original.cancelReceiptId != null;
      return (
        <span className={canceled ? "text-muted-foreground" : ""}>
          {canceled ? "Canceled" : "Paid"}
        </span>
      );
    },
  },
  {
    accessorKey: "doctorName",
    header: "Doctor",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.doctorName || "—"}</span>
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
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">{formatLKR(row.original.whd)}</span>
    ),
  },
  {
    accessorKey: "netAmount",
    header: "Net Amount",
    cell: ({ row }) => (
      <span className="tabular-nums">{formatLKR(row.original.netAmount)}</span>
    ),
  },
  {
    accessorKey: "remarks",
    header: "Remark",
    cell: ({ row }) => (
      <span className="max-w-[140px] truncate block text-muted-foreground text-sm" title={row.original.remarks || ""}>
        {row.original.remarks || "—"}
      </span>
    ),
  },
  {
    id: "cancelInfo",
    header: "Cancel Reason & Cancel Receipt",
    cell: ({ row }) => {
      const r = row.original;
      if (!r.cancelReceiptNoString && !r.cancelReason) return "—";
      return (
        <span className="text-muted-foreground text-sm">
          {r.cancelReason ?? ""} {r.cancelReceiptNoString ? `(${r.cancelReceiptNoString})` : ""}
        </span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created By Date",
    cell: ({ row }) => {
      const r = row.original;
      const by = r.createdByName ?? r.createdBy ?? "—";
      const d = r.createdAt;
      if (!d) return "—";
      try {
        return (
          <span className="text-muted-foreground text-sm">
            {by} · {format(new Date(d), "dd MMM yyyy HH:mm")}
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
        <DoctorPaymentRecordActions row={row} />
      </div>
    ),
  },
];
