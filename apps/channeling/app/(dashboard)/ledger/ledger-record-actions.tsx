"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Row } from "@tanstack/react-table"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import { Button } from "@/components/ui/button"
import { Pencil, XCircle } from "lucide-react"
import type { LedgerReceiptListItem } from "@/services/ledger/list-ledger-receipts.service"
import { EditLedgerTransactionDialog } from "./edit-ledger-transaction-dialog"
import { CancelLedgerEntryDialog } from "./cancel-ledger-entry-dialog"
import { RECEIPT_METHOD } from "@/types/receipt"

type LedgerRecordActionsProps = {
  row: Row<LedgerReceiptListItem>
  canCancel: boolean
}

export function LedgerRecordActions({ row, canCancel }: LedgerRecordActionsProps) {
  const router = useRouter()
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false)
  const r = row.original
  const receiptId = r.id ?? null
  const showCancel =
    canCancel &&
    Boolean(receiptId) &&
    !r.canceledAt &&
    !r.reverseReceiptId &&
    !r.reversedReceiptId &&
    r.method !== RECEIPT_METHOD.BANK_DEPOSIT

  const handleCancelSuccess = () => {
    router.refresh()
  }

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
        {showCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => setCancelDialogOpen(true)}
          >
            <XCircle className="h-4 w-4" />
            <span className="sr-only">Cancel entry</span>
          </Button>
        )}
      </DataTableRowActions>
      <EditLedgerTransactionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        receiptId={receiptId}
      />
      <CancelLedgerEntryDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        receiptId={receiptId ?? ""}
        receiptNoString={r.receiptNoString ?? ""}
        onSuccess={handleCancelSuccess}
      />
    </>
  )
}
