"use client"

import React from "react"
import type { ReceiptTemplateRecord, ReceiptPlaceholderMap } from "@/types/receipt-template-db"
import { replacePlaceholders } from "@/lib/receipt-template/replace-placeholders"

type ReceiptTemplateDbViewProps = {
  template: ReceiptTemplateRecord
  placeholders: ReceiptPlaceholderMap
  /** Optional class for the root (e.g. for print area) */
  className?: string
  /** If true, apply paper dimensions to root (for slip/custom size print) */
  applyPaperSize?: boolean
}

/**
 * Renders a DB receipt template with header, body, and footer content after replacing placeholders.
 * Use for print; paper dimensions from template are applied when applyPaperSize is true.
 */
export function ReceiptTemplateDbView({
  template,
  placeholders,
  className,
  applyPaperSize = false,
}: ReceiptTemplateDbViewProps) {
  const headerHtml = template.headerTemplate
    ? replacePlaceholders(template.headerTemplate.content, placeholders)
    : ""
  const bodyHtml = replacePlaceholders(template.bodyContent, placeholders)
  const footerHtml = template.footerTemplate
    ? replacePlaceholders(template.footerTemplate.content, placeholders)
    : ""

  const widthMm = template.paperWidthMm ?? undefined
  const heightMm = template.paperHeightMm ?? undefined
  const style: React.CSSProperties = applyPaperSize
    ? {
        width: widthMm != null ? `${widthMm}mm` : undefined,
        minHeight: heightMm != null ? `${heightMm}mm` : undefined,
        maxWidth: widthMm != null ? `${widthMm}mm` : undefined,
      }
    : {}

  return (
    <div
      className={className ?? ""}
      style={style}
      data-receipt-template
      data-variant={template.variant}
    >
      {headerHtml && (
        <div
          className="receipt-header whitespace-pre-wrap text-center text-sm mb-4"
          dangerouslySetInnerHTML={{ __html: headerHtml }}
        />
      )}
      <div
        className="receipt-body whitespace-pre-wrap text-sm mb-4"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
      {footerHtml && (
        <div
          className="receipt-footer whitespace-pre-wrap text-xs text-muted-foreground border-t pt-2 mt-4"
          dangerouslySetInnerHTML={{ __html: footerHtml }}
        />
      )}
    </div>
  )
}
