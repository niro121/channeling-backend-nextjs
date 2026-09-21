"use client"

import { useState } from "react"
import { Printer, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/hooks/use-toast"
import { printLedgerReceiptAction } from "@/app/actions/ledger/print-ledger-receipt.action"
import { buildLedgerReceiptPrintHtml } from "@/lib/receipt-template/build-print-html"
import { printHtmlInIframe } from "@/lib/receipt-template/print-html-iframe"
import { cn } from "@/lib/utils"

export async function printLedgerReceiptById(
  receiptId: string
): Promise<{ success: boolean; message?: string }> {
  if (!receiptId.trim()) {
    return { success: false, message: "Receipt is required." }
  }
  const result = await printLedgerReceiptAction(receiptId.trim())
  if (!result.success || !result.data) {
    return { success: false, message: result.message ?? "Could not prepare the receipt." }
  }
  const html = buildLedgerReceiptPrintHtml(
    result.data.placeholders,
    result.data.template,
    result.data.receiptNoString
  )
  printHtmlInIframe(html, {
    title: "Print receipt",
    // A5 paper box. Side inset comes from the printer (Default margins), not the template.
    width: "148mm",
    height: "210mm",
  })
  return { success: true }
}

type PrintLedgerReceiptButtonProps = {
  receiptId: string
  label?: string
  iconOnly?: boolean
  className?: string
  size?: "sm" | "default"
  variant?: "default" | "outline" | "ghost"
}

export function PrintLedgerReceiptButton({
  receiptId,
  label = "Print Receipt",
  iconOnly = false,
  className,
  size = "sm",
  variant = "default",
}: PrintLedgerReceiptButtonProps) {
  const { toast } = useToast()
  const [printing, setPrinting] = useState(false)

  async function handlePrint() {
    if (!receiptId || printing) return
    setPrinting(true)
    try {
      const result = await printLedgerReceiptById(receiptId)
      if (!result.success) {
        toast({
          title: "Print failed",
          description: result.message ?? "Could not print the receipt.",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Print failed",
        description: e instanceof Error ? e.message : "Could not print the receipt.",
        variant: "destructive",
      })
    } finally {
      setPrinting(false)
    }
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handlePrint}
        disabled={printing}
        className={cn("text-slate-500 hover:text-foreground p-0.5 -m-0.5 disabled:opacity-50", className)}
        title="Print receipt"
        aria-label="Print receipt"
      >
        {printing ? <Loader2 className="size-3 animate-spin" /> : <Printer className="size-3" />}
      </button>
    )
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handlePrint}
      disabled={printing}
      className={cn("gap-1.5", className)}
    >
      {printing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
      {label}
    </Button>
  )
}
