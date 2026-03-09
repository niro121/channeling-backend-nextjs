"use client";

import React from "react";
import { ExportWrapper } from "../export-wrapper";
import { ReceiptSequenceHelp } from "./receipt-sequence-help";
import type { ReceiptExportRow } from "@/app/actions/receipt-manager/receipt-manager.actions";

const EXPORT_COLUMNS: string[] = [
  "Receipt No",
  "Method",
  "Type",
  "Payment Method",
  "Amount",
  "WHT",
  "Location",
  "Date",
  "Remarks",
];

const EXPORT_KEYS: (keyof ReceiptExportRow)[] = [
  "receiptNoString",
  "method",
  "type",
  "paymentMethod",
  "amount",
  "wht",
  "locationName",
  "createdAt",
  "remarks",
];

type ReceiptManagerToolbarProps = {
  serverData: () => Promise<{
    success: boolean;
    data?: ReceiptExportRow[];
    message?: string;
  }>;
};

export function ReceiptManagerToolbar({ serverData }: ReceiptManagerToolbarProps) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <ReceiptSequenceHelp />
      <ExportWrapper<ReceiptExportRow>
        serverData={serverData}
        columns={EXPORT_COLUMNS}
        keys={EXPORT_KEYS}
        title="Receipts"
        fileName="receipts"
      />
    </div>
  );
}
