"use client"

import React from "react"
import { EditLedgerTransactionDialog } from "./edit-ledger-transaction-dialog"

type ReceiptNoCellProps = {
  id: string
  receiptNoString: string
}

export function ReceiptNoCell({ id, receiptNoString }: ReceiptNoCellProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-sm text-primary hover:underline underline-offset-2 text-left"
        title="View / Edit"
      >
        {receiptNoString || "—"}
      </button>
      <EditLedgerTransactionDialog
        open={open}
        onOpenChange={setOpen}
        receiptId={id}
      />
    </>
  )
}
