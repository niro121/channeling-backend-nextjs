"use client"

import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil } from "lucide-react"
import type {
  ReceiptTemplateRecord,
  ReceiptHeaderTemplateRecord,
  ReceiptFooterTemplateRecord,
} from "@/types/receipt-template-db"
import { RECEIPT_TEMPLATE_TYPES, RECEIPT_TEMPLATE_VARIANTS } from "@/types/receipt-template-db"

type ReceiptTemplatesContentProps = {
  initialTemplates: ReceiptTemplateRecord[]
  initialHeaders: ReceiptHeaderTemplateRecord[]
  initialFooters: ReceiptFooterTemplateRecord[]
}

function typeName(id: string): string {
  return RECEIPT_TEMPLATE_TYPES.find((t) => t.id === id)?.name ?? id
}
function variantName(id: string): string {
  return RECEIPT_TEMPLATE_VARIANTS.find((v) => v.id === id)?.name ?? id
}

export function ReceiptTemplatesContent({
  initialTemplates,
  initialHeaders,
  initialFooters,
}: ReceiptTemplatesContentProps) {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Receipt templates</CardTitle>
          <Link href="/admin/receipt-templates/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add template
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Main templates: type (e.g. Ledger), variant (slip printer or custom size), body content with placeholders, optional header/footer, paper size.
          </p>
          {initialTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No receipt templates yet. Add one to override the default print layout.</p>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Variant</th>
                    <th className="text-left p-3 font-medium">Paper (mm)</th>
                    <th className="text-left p-3 font-medium">Header / Footer</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {initialTemplates.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="p-3">{t.name}</td>
                      <td className="p-3">{typeName(t.type)}</td>
                      <td className="p-3">{variantName(t.variant)}</td>
                      <td className="p-3">
                        {t.paperWidthMm != null || t.paperHeightMm != null
                          ? `${t.paperWidthMm ?? "—"} × ${t.paperHeightMm ?? "—"}`
                          : "—"}
                      </td>
                      <td className="p-3">
                        {t.headerTemplate?.name ?? "—"} / {t.footerTemplate?.name ?? "—"}
                      </td>
                      <td className="p-3">{t.status === 1 ? "Active" : "Inactive"}</td>
                      <td className="p-3 text-right">
                        <Link href={`/admin/receipt-templates/${t.id}/edit`}>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Header templates</CardTitle>
          <Link href="/admin/receipt-templates/headers/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add header
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Reusable header content. Placeholders: {`{{company_name}}`}, {`{{location_name}}`}, {`{{tel}}`}, {`{{email}}`}, {`{{web}}`}.
          </p>
          {initialHeaders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No header templates yet.</p>
          ) : (
            <ul className="space-y-2">
              {initialHeaders.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="font-medium">{h.name}</span>
                  <Link href={`/admin/receipt-templates/headers/${h.id}/edit`}>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Footer templates</CardTitle>
          <Link href="/admin/receipt-templates/footers/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add footer
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Reusable footer content. Placeholders: {`{{generated_by}}`}, {`{{generated_at}}`}.
          </p>
          {initialFooters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No footer templates yet.</p>
          ) : (
            <ul className="space-y-2">
              {initialFooters.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="font-medium">{f.name}</span>
                  <Link href={`/admin/receipt-templates/footers/${f.id}/edit`}>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
