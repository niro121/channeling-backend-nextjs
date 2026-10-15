"use client"

import React, { useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LedgerTransactionForm } from "./ledger-transaction-form"
import { printLedgerReceiptById } from "./print-ledger-receipt-button"
import type { ReferenceSelectOption } from "@/types/reference"
import type { LedgerTransactionType } from "@/services/ledger/create-ledger-receipt.service"

type BankOption = { id: string; name: string }
type BankAccountOption = {
  id: string
  name: string
  accountNumber: string
  locationId: string
  locationName: string
  locationCode: string
  glAccountId: string | null
  glAccountName: string | null
  glAccountCode: string | null
}

type AddLedgerTransactionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: ReferenceSelectOption[]
  agencies: ReferenceSelectOption[]
  banks: BankOption[]
  bankAccounts: BankAccountOption[]
  userLocationId?: string | null
  userLocationName?: string | null
  allowedTransactionTypes: LedgerTransactionType[]
}

export function AddLedgerTransactionDialog({
  open,
  onOpenChange,
  locations,
  agencies,
  banks,
  bankAccounts,
  userLocationId = null,
  userLocationName = null,
  allowedTransactionTypes,
}: AddLedgerTransactionDialogProps) {
  const router = useRouter()

  const handleSuccess = () => {
    onOpenChange(false)
    router.refresh()
  }

  const openPrintViewForReceipt = useCallback(async (receiptId: string) => {
    await printLedgerReceiptById(receiptId)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
        </DialogHeader>
        <div className="pt-2">
          <LedgerTransactionForm
            locations={locations}
            agencies={agencies}
            banks={banks}
            bankAccounts={bankAccounts}
            userLocationId={userLocationId}
            userLocationName={userLocationName}
            allowedTransactionTypes={allowedTransactionTypes}
            onSuccess={handleSuccess}
            onSuccessWithReceiptId={openPrintViewForReceipt}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
