import React from "react"
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"
import { ReceiptHeaderTemplateForm } from "../../receipt-header-form"
import { BackButton } from "@/components/common/back-button"

export default async function NewReceiptHeaderTemplatePage() {
  const canView = await checkRouteAccess("/admin/receipt-templates")
  if (!canView) redirect("/unauthorized-access")

  return (
    <div className="flex-1 space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">New header template</h2>
        <BackButton href="/admin/receipt-templates" />
      </div>
      <ReceiptHeaderTemplateForm template={null} />
    </div>
  )
}
