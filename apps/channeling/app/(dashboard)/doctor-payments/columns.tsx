"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { DoctorPaymentListItem } from "@/services/doctor-payment/get-doctor-payment-list.service";
import { format } from "date-fns";
import { formatLKR } from "@/lib/format-money";
import { PAYMENT_METHOD_NAMES } from "@/types/receipt";
import { DoctorPaymentRecordActions } from "./record-actions";

function isCanceled(row: DoctorPaymentListItem): boolean {
  return row.cancelReceiptId != null;
}

export const DoctorPaymentColumns: ColumnDef<DoctorPaymentListItem>[] = [
  {
    accessorKey: "receiptNoString",
    header: "Payment Receipt",
    cell: ({ row }) => {
      const canceled = isCanceled(row.original);
      return (
        <span className={`font-medium ${canceled ? "text-destructive" : ""}`}>
          {row.original.receiptNoString || "—"}
        </span>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const canceled = isCanceled(row.original);
      return (
        <span className={canceled ? "font-medium text-destructive" : ""}>
          {canceled ? "Canceled" : "Paid"}
        </span>
      );
    },
  },
  {
    accessorKey: "doctorName",
    header: "Doctor",
    cell: ({ row }) => {
      const canceled = isCanceled(row.original);
      return (
        <span className={canceled ? "text-destructive" : "text-muted-foreground"}>
          {row.original.doctorName || "—"}
        </span>
      );
    },
  },
  {
    id: "paymentMethod",
    header: "Payment Method",
    cell: ({ row }) => {
      const canceled = isCanceled(row.original);
      return (
        <span className={`text-sm ${canceled ? "text-destructive" : "text-muted-foreground"}`}>
          {PAYMENT_METHOD_NAMES[row.original.paymentMethod] ?? row.original.paymentMethod ?? "—"}
        </span>
      );
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const canceled = isCanceled(row.original);
      return (
        <span className={`tabular-nums ${canceled ? "text-destructive" : ""}`}>
          {formatLKR(row.original.amount)}
        </span>
      );
    },
  },
  {
    accessorKey: "whd",
    header: "WHT",
    cell: ({ row }) => {
      const canceled = isCanceled(row.original);
      return (
        <span className={`tabular-nums ${canceled ? "text-destructive" : "text-muted-foreground"}`}>
          {formatLKR(row.original.whd)}
        </span>
      );
    },
  },
  {
    accessorKey: "netAmount",
    header: "Net Amount",
    cell: ({ row }) => {
      const canceled = isCanceled(row.original);
      return (
        <span className={`tabular-nums ${canceled ? "text-destructive" : ""}`}>
          {formatLKR(row.original.netAmount)}
        </span>
      );
    },
  },
  {
    accessorKey: "remarks",
    header: "Remark",
    cell: ({ row }) => {
      const canceled = isCanceled(row.original);
      return (
        <span
          className={`max-w-[140px] truncate block text-sm ${canceled ? "text-destructive" : "text-muted-foreground"}`}
          title={row.original.remarks || ""}
        >
          {row.original.remarks || "—"}
        </span>
      );
    },
  },
  {
    id: "cancelInfo",
    header: "Cancel Reason & Cancel Receipt",
    cell: ({ row }) => {
      const r = row.original;
      const canceled = isCanceled(r);
      if (!r.cancelReceiptNoString && !r.cancelReason) return "—";
      return (
        <span className={`text-sm ${canceled ? "text-destructive" : "text-muted-foreground"}`}>
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
      const canceled = isCanceled(r);
      const by = r.createdByName ?? r.createdBy ?? "—";
      const d = r.createdAt;
      if (!d) return "—";
      try {
        return (
          <span className={`text-sm ${canceled ? "text-destructive" : "text-muted-foreground"}`}>
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
