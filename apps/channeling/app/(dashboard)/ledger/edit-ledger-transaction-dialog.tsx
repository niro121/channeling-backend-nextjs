"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { LedgerReceiptView } from "./ledger-receipt-view"
import { getLedgerReceipt } from "@/app/actions/ledger/get-ledger-receipt.action"
import { PrintLedgerReceiptButton } from "./print-ledger-receipt-button"
import type { LedgerReceiptDetail } from "@/services/ledger/get-ledger-receipt.service"

type EditLedgerTransactionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  receiptId: string | null
}

export function EditLedgerTransactionDialog({
  open,
  onOpenChange,
  receiptId,
}: EditLedgerTransactionDialogProps) {
  const router = useRouter()
  const [receipt, setReceipt] = useState<LedgerReceiptDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !receiptId) {
      setReceipt(null)
      setError(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getLedgerReceipt(receiptId)
      .then((receiptRes) => {
        if (cancelled) return
        if (receiptRes.success && receiptRes.data) {
          setReceipt(receiptRes.data)
          setError(null)
        } else {
          setReceipt(null)
          setError(receiptRes.message ?? "Receipt not found.")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, receiptId])

  const handleOpenChange = (next: boolean) => {
    if (!next) router.refresh()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {receipt
              ? `Ledger transaction — ${receipt.receiptNoString}`
              : receiptId
                ? "Loading..."
                : "Ledger transaction"}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : error ? (
          <div className="py-8 text-center text-destructive">{error}</div>
        ) : receipt ? (
          <LedgerReceiptView receipt={receipt} />
        ) : null}
        {receipt && (
          <DialogFooter className="mt-4">
            <PrintLedgerReceiptButton receiptId={receipt.id} variant="outline" />
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
