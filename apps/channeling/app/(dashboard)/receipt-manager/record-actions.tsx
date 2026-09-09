"use client";

import React from "react";
import { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import type { ReceiptListItem } from "@/services/receipt-manager/get-receipt-list.service";
import { useReceiptManagerView } from "./receipt-manager-view-context";

type ReceiptManagerRecordActionsProps = {
  row: Row<ReceiptListItem>;
};

export function ReceiptManagerRecordActions({ row }: ReceiptManagerRecordActionsProps) {
  const receiptId = row.original.id;
  const openView = useReceiptManagerView()?.openView;

  return (
    <div className="flex items-center justify-end gap-1">
      {openView ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="View receipt and journal"
          onClick={() => openView(receiptId)}
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">View</span>
        </Button>
      ) : null}
    </div>
  );
}
