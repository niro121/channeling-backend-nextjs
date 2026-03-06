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
import { getLedgerReceipt } from "@/app/actions/ledger/get-ledger-receipt.action"
import { getActiveReceiptTemplateAction } from "@/app/actions/receipt-template.actions"
import { buildPlaceholdersForLedger } from "@/lib/receipt-template/build-placeholders"
import { buildReceiptPrintHtml } from "@/lib/receipt-template/build-print-html"
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

  const openPrintViewForReceipt = useCallback(async (receiptId: string) => {
    const [receiptRes, templateRes] = await Promise.all([
      getLedgerReceipt(receiptId),
      getActiveReceiptTemplateAction("ledger", "custom_size"),
    ])
    if (!receiptRes.success || !receiptRes.data) return
    const receipt = receiptRes.data
    const dbTemplate = templateRes.success ? templateRes.data : null
    const placeholders = buildPlaceholdersForLedger(receipt)
    const html = buildReceiptPrintHtml(receipt, placeholders, dbTemplate)
    const iframe = document.createElement("iframe")
    iframe.setAttribute("style", "position:absolute;width:0;height:0;border:0;visibility:hidden")
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document
    if (!doc) {
      document.body.removeChild(iframe)
      return
    }
    doc.open()
    doc.write(html)
    doc.close()
    const win = iframe.contentWindow
    if (!win) {
      document.body.removeChild(iframe)
      return
    }
    const runPrint = () => {
      win.focus()
      win.print()
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe)
      }, 500)
    }
    if (doc.readyState === "complete") {
      setTimeout(runPrint, 100)
    } else {
      iframe.onload = () => setTimeout(runPrint, 100)
    }
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
            userLocationId={userLocationId}
            userLocationName={userLocationName}
            onSuccess={handleSuccess}
            onSuccessWithReceiptId={openPrintViewForReceipt}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
