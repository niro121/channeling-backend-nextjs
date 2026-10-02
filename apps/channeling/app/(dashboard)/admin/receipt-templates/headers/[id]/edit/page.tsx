import React from "react"
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect, notFound } from "next/navigation"
import { ReceiptHeaderTemplateForm } from "../../../receipt-header-form"
import { getReceiptHeaderTemplateById } from "@/services/receipt-template/receipt-template.service"
import { BackButton } from "@/components/common/back-button"

export default async function EditReceiptHeaderTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const canView = await checkRouteAccess("/admin/receipt-templates")
  if (!canView) redirect("/unauthorized-access")

  const { id } = await params
  const res = await getReceiptHeaderTemplateById(id)
  if (!res.success || !res.data) notFound()

  return (
    <div className="flex-1 space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Edit header template</h2>
        <BackButton href="/admin/receipt-templates" />
      </div>
      <ReceiptHeaderTemplateForm template={res.data} />
    </div>
  )
}
