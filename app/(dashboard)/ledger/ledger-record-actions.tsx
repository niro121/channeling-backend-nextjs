"use client"

import React from "react"
import { Row } from "@tanstack/react-table"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import type { LedgerReceiptListItem } from "@/services/ledger/list-ledger-receipts.service"
import { EditLedgerTransactionDialog } from "./edit-ledger-transaction-dialog"

type LedgerRecordActionsProps = {
  row: Row<LedgerReceiptListItem>
}

export function LedgerRecordActions({ row }: LedgerRecordActionsProps) {
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const receiptId = row.original.id ?? null

  return (
    <>
      <DataTableRowActions>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setEditDialogOpen(true)}
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">View / Edit</span>
        </Button>
      </DataTableRowActions>
      <EditLedgerTransactionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        receiptId={receiptId}
      />
    </>
  )
}
