"use client"

import React from "react"
import { Form, Formik, FormikHelpers } from "formik"
import * as Yup from "yup"
import { useToast } from "@/components/hooks/use-toast"
import { useRouter } from "next/navigation"
import CustomFormField from "@/components/common/form-field"
import CustomSelectField from "@/components/common/custom-select-field"
import { Button } from "@/components/ui/button"
import { Ban, Save, Loader2 } from "lucide-react"
import type { SmsTemplate, SmsTemplateFormValues } from "@/types/sms-template"
import { SMS_TEMPLATE_TYPES } from "@/types/sms-template"
import { createSmsTemplate, updateSmsTemplate } from "@/app/actions/sms-template.actions"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

type SmsTemplateFormProps = {
  template: SmsTemplate | null
  isEditPage?: boolean
}

const typeOptions = SMS_TEMPLATE_TYPES.map((t) => ({ id: String(t.id), name: t.name }))
const statusOptions = [
  { id: "0", name: "Inactive" },
  { id: "1", name: "Active" },
]

export default function SmsTemplateForm({ template, isEditPage = false }: SmsTemplateFormProps) {
  const [loading, setLoading] = React.useState(false)
  const saveAndCloseRef = React.useRef(false)
  const { toast } = useToast()
  const router = useRouter()

  const initialValues: SmsTemplateFormValues = {
    name: template?.name ?? "",
    type: template?.type ?? null,
    message: template?.message ?? "",
    status: template?.status != null ? template.status : 1,
  }

  const validationSchema = Yup.object({
    name: Yup.string()
      .max(200, "Must be less than 200 characters")
      .required("This field is mandatory"),
    type: Yup.number().integer().min(0).max(5).nullable(),
    message: Yup.string().required("This field is mandatory"),
    status: Yup.number()
      .oneOf([0, 1], "Status must be Inactive (0) or Active (1)")
      .required("This field is mandatory"),
  })

  const handleSubmit = async (
    values: SmsTemplateFormValues,
    { setErrors, setTouched }: FormikHelpers<SmsTemplateFormValues>
  ) => {
    const closeAfterSave = saveAndCloseRef.current
    try {
      setLoading(true)
      const payload = {
        ...values,
        type: values.type ?? null,
      }

      if (template?.id) {
        const respond = await updateSmsTemplate(template.id, payload)
        setLoading(false)
        if (!respond?.success) {
          if (respond?.error?.issues) {
            const fieldErrors: Record<string, string> = {}
            Object.keys(respond.error.issues).forEach((key) => {
              const err = respond.error!.issues![key]
              if (Array.isArray(err) && err[0]) fieldErrors[key] = err[0]
            })
            setErrors(fieldErrors)
            setTouched(
              Object.keys(fieldErrors).reduce((acc, k) => ({ ...acc, [k]: true }), {})
            )
          }
          toast({
            variant: "destructive",
            title: "Error",
            description: respond.message ?? "Update failed.",
          })
          return
        }
        toast({ title: "Success", description: "SMS template updated successfully." })
        if (closeAfterSave) router.push("/sms-templates")
        else router.refresh()
      } else {
        const respond = await createSmsTemplate(payload)
        setLoading(false)
        if (!respond?.success) {
          if (respond?.error?.issues) {
            const fieldErrors: Record<string, string> = {}
            Object.keys(respond.error.issues).forEach((key) => {
              const err = respond.error!.issues![key]
              if (Array.isArray(err) && err[0]) fieldErrors[key] = err[0]
            })
            setErrors(fieldErrors)
            setTouched(
              Object.keys(fieldErrors).reduce((acc, k) => ({ ...acc, [k]: true }), {})
            )
          }
          toast({
            variant: "destructive",
            title: "Error",
            description: respond.message ?? "Create failed.",
          })
          return
        }
        toast({ title: "Success", description: "SMS template created successfully." })
        const newId = respond.data?.id
        if (closeAfterSave) router.push("/sms-templates")
        else if (newId) router.push(`/sms-templates/${newId}/edit`)
        else router.push("/sms-templates")
      }
    } catch (error: unknown) {
      setLoading(false)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Save failed.",
      })
    }
  }

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      enableReinitialize
    >
      {({ values, setFieldValue, errors, touched, handleChange, handleBlur }) => (
        <Form className="space-y-6">
          <CustomFormField
            id="name"
            type="text"
            placeholder="Template name"
            value={values.name}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          <CustomSelectField
            id="type"
            label="Type"
            placeholder="Select type"
            required={false}
            options={[{ id: "", name: "— None —" }, ...typeOptions]}
            value={values.type != null ? String(values.type) : ""}
            onChange={(v) => setFieldValue("type", v === "" ? null : parseInt(v, 10))}
          />
          <div className="space-y-2">
            <Label htmlFor="message">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="message"
              name="message"
              placeholder="SMS message. Use placeholders e.g. {doctor}, {room_no}, {start_time}"
              value={values.message}
              onChange={(e) => setFieldValue("message", e.target.value)}
              onBlur={() => setFieldValue("message", values.message)}
              className="min-h-[120px] resize-y"
              required
            />
            {touched.message && errors.message && (
              <p className="text-sm text-destructive">{errors.message}</p>
            )}
          </div>
          <CustomSelectField
            id="status"
            label="Status"
            placeholder="Select status"
            required
            options={statusOptions}
            value={String(values.status)}
            onChange={(v) => setFieldValue("status", parseInt(v, 10))}
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading}
              onClick={() => { saveAndCloseRef.current = false }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEditPage ? "Update" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/sms-templates")}
            >
              <Ban className="h-4 w-4" />
              Cancel
            </Button>
            {!isEditPage && (
              <Button
                type="submit"
                variant="secondary"
                disabled={loading}
                onClick={() => { saveAndCloseRef.current = true }}
              >
                Save &amp; Close
              </Button>
            )}
          </div>
        </Form>
      )}
    </Formik>
  )
}
