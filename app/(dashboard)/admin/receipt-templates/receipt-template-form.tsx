"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useFormik } from "formik"
import * as Yup from "yup"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/hooks/use-toast"
import type { ReceiptTemplateRecord, ReceiptHeaderTemplateRecord, ReceiptFooterTemplateRecord } from "@/types/receipt-template-db"
import { RECEIPT_TEMPLATE_TYPES, RECEIPT_TEMPLATE_VARIANTS, RECEIPT_BODY_PLACEHOLDERS } from "@/types/receipt-template-db"
import { createReceiptTemplateAction, updateReceiptTemplateAction } from "@/app/actions/receipt-template.actions"

type ReceiptTemplateFormProps = {
  template: ReceiptTemplateRecord | null
  headers: ReceiptHeaderTemplateRecord[]
  footers: ReceiptFooterTemplateRecord[]
}

const schema = Yup.object({
  name: Yup.string().required("Name is required"),
  type: Yup.string().required("Type is required"),
  variant: Yup.string().required("Variant is required"),
  bodyContent: Yup.string().required("Body content is required"),
  paperWidthMm: Yup.mixed<number | "">().nullable().transform((v) => (v === "" ? null : Number(v))),
  paperHeightMm: Yup.mixed<number | "">().nullable().transform((v) => (v === "" ? null : Number(v))),
  status: Yup.number().required(),
})

export function ReceiptTemplateForm({ template, headers, footers }: ReceiptTemplateFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const isEdit = !!template

  const formik = useFormik({
    initialValues: {
      name: template?.name ?? "",
      type: template?.type ?? "ledger",
      variant: template?.variant ?? "custom_size",
      headerTemplateId: template?.headerTemplateId ?? "",
      footerTemplateId: template?.footerTemplateId ?? "",
      bodyContent: template?.bodyContent ?? "",
      paperWidthMm: template?.paperWidthMm ?? "",
      paperHeightMm: template?.paperHeightMm ?? "",
      status: template?.status ?? 1,
    },
    validationSchema: schema,
    onSubmit: async (values) => {
      const payload = {
        name: values.name,
        type: values.type,
        variant: values.variant,
        headerTemplateId: values.headerTemplateId || null,
        footerTemplateId: values.footerTemplateId || null,
        bodyContent: values.bodyContent,
        paperWidthMm: values.paperWidthMm === "" ? null : Number(values.paperWidthMm),
        paperHeightMm: values.paperHeightMm === "" ? null : Number(values.paperHeightMm),
        status: values.status,
      }
      if (isEdit && template) {
        const res = await updateReceiptTemplateAction(template.id, payload)
        if (res.success) {
          toast({ title: "Saved", description: "Receipt template updated." })
          router.push("/admin/receipt-templates")
        } else {
          toast({ title: "Error", description: res.message, variant: "destructive" })
        }
      } else {
        const res = await createReceiptTemplateAction(payload)
        if (res.success) {
          toast({ title: "Created", description: "Receipt template created." })
          router.push("/admin/receipt-templates")
        } else {
          toast({ title: "Error", description: res.message, variant: "destructive" })
        }
      }
    },
  })

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formik.values.name}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder="e.g. Ledger Receipt - Custom"
        />
        {formik.touched.name && formik.errors.name && (
          <p className="text-sm text-destructive">{formik.errors.name}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={formik.values.type}
            onValueChange={(v) => formik.setFieldValue("type", v)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {RECEIPT_TEMPLATE_TYPES.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Variant</Label>
          <Select
            value={formik.values.variant}
            onValueChange={(v) => formik.setFieldValue("variant", v)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {RECEIPT_TEMPLATE_VARIANTS.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Header template</Label>
          <Select
            value={formik.values.headerTemplateId || "__none__"}
            onValueChange={(v) => formik.setFieldValue("headerTemplateId", v === "__none__" ? "" : v)}
          >
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {headers.map((h) => (
                <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Footer template</Label>
          <Select
            value={formik.values.footerTemplateId || "__none__"}
            onValueChange={(v) => formik.setFieldValue("footerTemplateId", v === "__none__" ? "" : v)}
          >
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {footers.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bodyContent">Body content (placeholders: {RECEIPT_BODY_PLACEHOLDERS.slice(0, 5).map((p) => `{{${p}}}`).join(", ")}…)</Label>
        <Textarea
          id="bodyContent"
          value={formik.values.bodyContent}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          rows={12}
          className="font-mono text-sm"
          placeholder="Receipt No: {{receipt_no}}\nDate: {{date_time}}\nAmount: {{amount}}"
        />
        {formik.touched.bodyContent && formik.errors.bodyContent && (
          <p className="text-sm text-destructive">{formik.errors.bodyContent}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="paperWidthMm">Paper width (mm)</Label>
          <Input
            id="paperWidthMm"
            type="number"
            min={1}
            max={500}
            value={formik.values.paperWidthMm}
            onChange={formik.handleChange}
            placeholder="e.g. 80"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paperHeightMm">Paper height (mm)</Label>
          <Input
            id="paperHeightMm"
            type="number"
            min={1}
            max={2000}
            value={formik.values.paperHeightMm}
            onChange={formik.handleChange}
            placeholder="optional"
          />
        </div>
      </div>
      {isEdit && (
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={String(formik.values.status)}
            onValueChange={(v) => formik.setFieldValue("status", Number(v))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Active</SelectItem>
              <SelectItem value="0">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={formik.isSubmitting}>
          {formik.isSubmitting ? "Saving…" : isEdit ? "Save" : "Create"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/receipt-templates")}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
