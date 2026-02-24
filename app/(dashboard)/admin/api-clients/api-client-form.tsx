"use client"

import React, { useState } from "react"
import { Form, Formik, FormikHelpers } from "formik"
import * as Yup from "yup"
import { Button } from "@/components/ui/button"
import { Ban, Save } from "lucide-react"
import { createApiClient, updateApiClient } from "@/app/actions/api-client.actions"
import { useToast } from "@/components/hooks/use-toast"
import { useRouter } from "next/navigation"
import CustomFormField from "@/components/common/form-field"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Copy } from "lucide-react"
import type { ApiClient } from "@/types/api-client"

type ApiClientFormProps = {
  apiClient: ApiClient | null
  isEditPage?: boolean
}

type FormValues = {
  name: string
  isBlocked: boolean
}

export default function ApiClientForm({ apiClient, isEditPage = false }: ApiClientFormProps) {
  const [loading, setLoading] = useState(false)
  const [createdSecret, setCreatedSecret] = useState<{ clientId: string; clientSecret: string } | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const initialValues: FormValues = {
    name: apiClient?.name ?? "",
    isBlocked: apiClient?.isBlocked ?? false,
  }

  const validationSchema = Yup.object({
    name: Yup.string()
      .required("Name is required")
      .max(150, "Must be less than 150 characters")
      .trim(),
    isBlocked: Yup.boolean().required(),
  })

  const handleSubmit = async (
    values: FormValues,
    { setErrors, setTouched }: FormikHelpers<FormValues>
  ) => {
    try {
      setLoading(true)
      if (apiClient?.id) {
        const respond = await updateApiClient(apiClient.id, {
          name: values.name.trim(),
          isBlocked: values.isBlocked,
        })
        setLoading(false)

        if (!respond.success) {
          if (respond.error?.issues) {
            const fieldErrors: Record<string, string> = {}
            const touchedFields: Record<string, boolean> = {}
            Object.entries(respond.error.issues).forEach(([key, messages]) => {
              const msg = Array.isArray(messages) ? messages[0] : messages
              if (msg) {
                fieldErrors[key] = msg
                touchedFields[key] = true
              }
            })
            setErrors(fieldErrors)
            setTouched(touchedFields)
            toast({
              variant: "destructive",
              title: "Validation Error",
              description: respond.error.message ?? "Please check the form for errors.",
            })
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description: respond.error?.message ?? "Update unsuccessful.",
            })
          }
          return
        }
        toast({
          variant: "success",
          title: "Success",
          description: "API client was updated successfully.",
        })
        router.push("/admin/api-clients")
      } else {
        const respond = await createApiClient({ name: values.name.trim() })
        setLoading(false)

        if (!respond.success) {
          if (respond.error?.issues) {
            const fieldErrors: Record<string, string> = {}
            const touchedFields: Record<string, boolean> = {}
            Object.entries(respond.error.issues).forEach(([key, messages]) => {
              const msg = Array.isArray(messages) ? messages[0] : messages
              if (msg) {
                fieldErrors[key] = msg
                touchedFields[key] = true
              }
            })
            setErrors(fieldErrors)
            setTouched(touchedFields)
            toast({
              variant: "destructive",
              title: "Validation Error",
              description: respond.error.message ?? "Please check the form for errors.",
            })
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description: respond.error?.message ?? "Create unsuccessful.",
            })
          }
          return
        }

        if (respond.data && "clientSecret" in respond.data && respond.data.clientSecret) {
          setCreatedSecret({
            clientId: respond.data.clientId,
            clientSecret: respond.data.clientSecret,
          })
        } else {
          toast({
            variant: "success",
            title: "Success",
            description: "API client was created successfully.",
          })
          router.push("/admin/api-clients")
        }
      }
    } catch (err) {
      setLoading(false)
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred.",
      })
    }
  }

  const styleClasses = {
    parentDiv: "grid grid-cols-1 items-center gap-4 sm:grid-cols-4",
    labelClassName: "text-sm text-black font-semibold capitalize",
    inputClassName: "col-span-full sm:col-span-3",
  }

  return (
    <>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={validationSchema}
        enableReinitialize={isEditPage}
        validateOnChange={false}
        validateOnBlur={false}
      >
        {(formik) => (
          <Form className="w-full">
            <div className="grid gap-4 rounded-lg border p-6">
              <CustomFormField
                type="text"
                id="name"
                placeholder="Application name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={styleClasses}
              />

              {isEditPage && (
                <div className={styleClasses.parentDiv}>
                  <Label className={styleClasses.labelClassName} htmlFor="isBlocked">
                    Blocked
                  </Label>
                  <div className={styleClasses.inputClassName}>
                    <Switch
                      id="isBlocked"
                      checked={formik.values.isBlocked}
                      onCheckedChange={(checked) => formik.setFieldValue("isBlocked", checked)}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      When blocked, this client cannot obtain tokens or call the public API.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col justify-end gap-3 sm:flex-row">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white sm:w-24"
                  type="button"
                  onClick={() => router.push("/admin/api-clients")}
                  disabled={loading}
                >
                  <Ban className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
                <Button
                  disabled={loading}
                  size="sm"
                  type="submit"
                  className="w-full gap-1 px-6 text-white sm:w-auto"
                >
                  <Save className="h-4 w-4" />
                  <span>{apiClient?.id ? "Save" : "Create"}</span>
                </Button>
              </div>
            </div>
          </Form>
        )}
      </Formik>

      <Dialog open={!!createdSecret} onOpenChange={(open) => !open && setCreatedSecret(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>API client created</DialogTitle>
            <DialogDescription>
              Save the client secret now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>
          {createdSecret && (
            <div className="space-y-4 py-2">
              <div className="space-y-2 rounded-md bg-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-sm">Client ID</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void navigator.clipboard.writeText(createdSecret.clientId)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="break-all font-mono text-sm">{createdSecret.clientId}</p>
              </div>
              <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-amber-700 font-medium dark:text-amber-400 text-sm">
                    Client secret (show once)
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void navigator.clipboard.writeText(createdSecret.clientSecret)
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="break-all font-mono text-sm">{createdSecret.clientSecret}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                setCreatedSecret(null)
                router.push("/admin/api-clients")
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
