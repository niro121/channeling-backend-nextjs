"use client"

import React from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LedgerTransactionForm } from "./ledger-transaction-form"
import type { ReferenceSelectOption } from "@/types/reference"

type BankOption = { id: string; name: string }

type AddLedgerTransactionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: ReferenceSelectOption[]
  agencies: ReferenceSelectOption[]
  banks: BankOption[]
  userLocationId?: string | null
  userLocationName?: string | null
}

export function AddLedgerTransactionDialog({
  open,
  onOpenChange,
  locations,
  agencies,
  banks,
  userLocationId = null,
  userLocationName = null,
}: AddLedgerTransactionDialogProps) {
  const router = useRouter()

  const handleSuccess = () => {
    onOpenChange(false)
    router.refresh()
  }

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
            userLocationId={userLocationId}
            userLocationName={userLocationName}
            onSuccess={handleSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
