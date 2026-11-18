import React from "react"
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"
import { ReceiptTemplateForm } from "../receipt-template-form"
import { listReceiptHeaderTemplates, listReceiptFooterTemplates } from "@/services/receipt-template/receipt-template.service"
import { BackButton } from "@/components/common/back-button"

export default async function NewReceiptTemplatePage() {
  const canView = await checkRouteAccess("/admin/receipt-templates")
  if (!canView) redirect("/unauthorized-access")

  const [headersRes, footersRes] = await Promise.all([
    listReceiptHeaderTemplates(),
    listReceiptFooterTemplates(),
  ])
  const headers = headersRes.success ? headersRes.data ?? [] : []
  const footers = footersRes.success ? footersRes.data ?? [] : []

  return (
    <div className="flex-1 space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">New receipt template</h2>
        <BackButton href="/admin/receipt-templates" />
      </div>
      <ReceiptTemplateForm template={null} headers={headers} footers={footers} />
    </div>
  )
}
