"use client"

import type { LedgerReceiptDetail } from "@/services/ledger/get-ledger-receipt.service"
import { ReceiptTemplate } from "@/components/receipt-template/receipt-template"
import { buildLedgerReceiptTemplateData } from "@/lib/receipt-template/build-ledger-receipt-data"

type LedgerReceiptViewProps = {
  receipt: LedgerReceiptDetail
  /** Optional overrides for receipt template (company name, contact, etc.) */
  templateOptions?: Parameters<typeof buildLedgerReceiptTemplateData>[1]
  className?: string
}

export function LedgerReceiptView({
  receipt,
  templateOptions,
  className,
}: LedgerReceiptViewProps) {
  const templateData = buildLedgerReceiptTemplateData(receipt, templateOptions)
  return (
    <ReceiptTemplate data={templateData} className={className} />
  )
}
