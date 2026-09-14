"use client"

import { useState } from "react"
import { Printer, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/hooks/use-toast"
import { printBookingReceiptAction } from "@/app/actions/channel-booking"
import { buildBookingReceiptPrintHtml } from "@/lib/receipt-template/build-print-html"
import { cn } from "@/lib/utils"

function printHtmlInIframe(html: string) {
  const iframe = document.createElement("iframe")
  iframe.setAttribute("title", "Print receipt")
  iframe.setAttribute("style", "position:fixed;width:0;height:0;border:0;visibility:hidden")
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document
  const win = iframe.contentWindow
  if (!doc || !win) {
    document.body.removeChild(iframe)
    return
  }
  doc.open()
  doc.write(html)
  doc.close()
  const runPrint = () => {
    try {
      win.focus()
      win.print()
    } finally {
      window.setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe)
      }, 500)
    }
  }
  if (doc.readyState === "complete") {
    window.setTimeout(runPrint, 100)
  } else {
    iframe.onload = () => window.setTimeout(runPrint, 100)
  }
}

type PrintReceiptButtonProps = {
  receiptId: string
  label?: string
  iconOnly?: boolean
  className?: string
  size?: "sm" | "default"
  variant?: "default" | "outline" | "ghost"
}

export function PrintReceiptButton({
  receiptId,
  label = "Print Receipt",
  iconOnly = false,
  className,
  size = "sm",
  variant = "default",
}: PrintReceiptButtonProps) {
  const { toast } = useToast()
  const [printing, setPrinting] = useState(false)

  async function handlePrint() {
    if (!receiptId || printing) return
    setPrinting(true)
    try {
      const result = await printBookingReceiptAction(receiptId)
      if (!result.success || !result.data) {
        toast({
          title: "Print failed",
          description: result.message ?? "Could not prepare the receipt.",
          variant: "destructive",
        })
        return
      }
      const html = buildBookingReceiptPrintHtml(
        result.data.placeholders,
        result.data.template,
        result.data.receiptNoString
      )
      printHtmlInIframe(html)
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
        {printing ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Printer className="size-3" />
        )}
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
      {printing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Printer className="h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  )
}
