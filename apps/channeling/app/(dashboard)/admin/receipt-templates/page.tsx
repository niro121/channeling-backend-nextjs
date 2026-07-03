import React from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { checkRouteAccess } from "@/lib/server-permissions"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { redirect } from "next/navigation"
import { ReceiptTemplatesContent } from "./receipt-templates-content"
import {
  listReceiptTemplates,
  listReceiptHeaderTemplates,
  listReceiptFooterTemplates,
} from "@/services/receipt-template/receipt-template.service"

export default async function AdminReceiptTemplatesPage() {
  const canView = await checkRouteAccess("/admin/receipt-templates")
  if (!canView) {
    redirect("/unauthorized-access")
  }
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: "admin.receipt-templates.visited",
      entityType: "ReceiptTemplates",
      importance: "low",
    })
  }

  const [templatesRes, headersRes, footersRes] = await Promise.all([
    listReceiptTemplates(),
    listReceiptHeaderTemplates(),
    listReceiptFooterTemplates(),
  ])

  const templates = templatesRes.success ? templatesRes.data ?? [] : []
  const headers = headersRes.success ? headersRes.data ?? [] : []
  const footers = footersRes.success ? footersRes.data ?? [] : []

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Receipt templates</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure printable receipt layout with placeholders (e.g. {`{{receipt_no}}`}, {`{{amount}}`}). Each template can use a header and footer and be set for slip printer or custom size.
        </p>
      </div>
      <ReceiptTemplatesContent
        initialTemplates={templates}
        initialHeaders={headers}
        initialFooters={footers}
      />
    </div>
  )
}
