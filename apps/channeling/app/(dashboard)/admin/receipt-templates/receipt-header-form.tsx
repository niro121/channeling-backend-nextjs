"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useFormik } from "formik"
import * as Yup from "yup"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/hooks/use-toast"
import type { ReceiptHeaderTemplateRecord } from "@/types/receipt-template-db"
import { RECEIPT_HEADER_PLACEHOLDERS } from "@/types/receipt-template-db"
import { createReceiptHeaderTemplateAction, updateReceiptHeaderTemplateAction } from "@/app/actions/receipt-template.actions"

type Props = {
  template: ReceiptHeaderTemplateRecord | null
}

const schema = Yup.object({
  name: Yup.string().required("Name is required"),
  content: Yup.string().required("Content is required"),
})

export function ReceiptHeaderTemplateForm({ template }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const isEdit = !!template

  const formik = useFormik({
    initialValues: {
      name: template?.name ?? "",
      content: template?.content ?? "",
    },
    validationSchema: schema,
    onSubmit: async (values) => {
      if (isEdit && template) {
        const res = await updateReceiptHeaderTemplateAction(template.id, values)
        if (res.success) {
          toast({ title: "Saved", description: "Header template updated." })
          router.push("/admin/receipt-templates")
        } else {
          toast({ title: "Error", description: res.message, variant: "destructive" })
        }
      } else {
        const res = await createReceiptHeaderTemplateAction(values)
        if (res.success) {
          toast({ title: "Created", description: "Header template created." })
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
          placeholder="e.g. Default branch header"
        />
        {formik.touched.name && formik.errors.name && (
          <p className="text-sm text-destructive">{formik.errors.name}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Content (placeholders: {RECEIPT_HEADER_PLACEHOLDERS.map((p) => `{{${p}}}`).join(", ")})</Label>
        <Textarea
          id="content"
          value={formik.values.content}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          rows={8}
          className="font-mono text-sm"
          placeholder="{{company_name}}\n{{location_name}}\nTel: {{tel}}"
        />
        {formik.touched.content && formik.errors.content && (
          <p className="text-sm text-destructive">{formik.errors.content}</p>
        )}
      </div>
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
