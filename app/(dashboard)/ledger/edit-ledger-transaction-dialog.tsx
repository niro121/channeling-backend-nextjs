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
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import { LedgerReceiptView } from "./ledger-receipt-view"
import { getLedgerReceipt } from "@/app/actions/ledger/get-ledger-receipt.action"
import { getActiveReceiptTemplateAction } from "@/app/actions/receipt-template.actions"
import { buildPlaceholdersForLedger } from "@/lib/receipt-template/build-placeholders"
import { buildReceiptPrintHtml } from "@/lib/receipt-template/build-print-html"
import type { LedgerReceiptDetail } from "@/services/ledger/get-ledger-receipt.service"
import type { ReceiptTemplateRecord } from "@/types/receipt-template-db"

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
  const [dbTemplate, setDbTemplate] = useState<ReceiptTemplateRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !receiptId) {
      setReceipt(null)
      setDbTemplate(null)
      setError(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      getLedgerReceipt(receiptId),
      getActiveReceiptTemplateAction("ledger", "custom_size"),
    ])
      .then(([receiptRes, templateRes]) => {
        if (cancelled) return
        if (receiptRes.success && receiptRes.data) {
          setReceipt(receiptRes.data)
          setError(null)
        } else {
          setReceipt(null)
          setError(receiptRes.message ?? "Receipt not found.")
        }
        if (templateRes.success && templateRes.data) {
          setDbTemplate(templateRes.data)
        } else {
          setDbTemplate(null)
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

  const handlePrint = () => {
    if (!receipt) return
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
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print receipt
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
