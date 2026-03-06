"use client"

import React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddLedgerTransactionDialog } from "./add-ledger-transaction-dialog"
import type { ReferenceSelectOption } from "@/types/reference"

type BankOption = { id: string; name: string }

type LedgerToolbarWithAddDialogProps = {
  canAdd: boolean
  locations: ReferenceSelectOption[]
  agencies: ReferenceSelectOption[]
  banks: BankOption[]
  userLocationId?: string | null
  userLocationName?: string | null
}

export function LedgerToolbarWithAddDialog({
  canAdd,
  locations,
  agencies,
  banks,
  userLocationId = null,
  userLocationName = null,
}: LedgerToolbarWithAddDialogProps) {
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)

  return (
    <>
      <Button
        size="sm"
        className="gap-1.5 h-9 cursor-pointer"
        onClick={() => setAddDialogOpen(true)}
        disabled={!canAdd}
        asChild={false}
      >
        <Plus className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          Add transaction
        </span>
      </Button>
      <AddLedgerTransactionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        locations={locations}
        agencies={agencies}
        banks={banks}
        userLocationId={userLocationId}
        userLocationName={userLocationName}
      />
    </>
  )
}
