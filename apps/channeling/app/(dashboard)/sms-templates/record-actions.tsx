"use client"

import React from "react"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import CustomAlertDialogWithWarning from "@/components/common/custom-alert-dialog-with-warning"
import type { SmsTemplate } from "@/types/sms-template"
import { deleteSmsTemplate } from "@/app/actions/sms-template.actions"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/components/hooks/use-permissions"

type SmsTemplateActionsProps<TData extends SmsTemplate> = {
  row: Row<TData>
}

export function SmsTemplateRecordActions({ row }: SmsTemplateActionsProps<SmsTemplate>) {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { has } = usePermissions()
  const template = row.original

  const onDeleteConfirmation = async () => {
    if (!template.id) {
      toast({ variant: "destructive", title: "Error", description: "Template id not found." })
      return
    }
    try {
      setLoading(true)
      const result = await deleteSmsTemplate(template.id)
      if (result.success) {
        toast({ title: "Success", description: "SMS template was deleted successfully." })
        setShowDeleteConfirmation(false)
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message ?? "Delete failed." })
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e instanceof Error ? e.message : "Delete failed.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DataTableRowActions>
        {has("sms-templates", "edit") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/sms-templates/${template.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}
        {has("sms-templates", "delete") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            onClick={() => setShowDeleteConfirmation(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </DataTableRowActions>
      <CustomAlertDialogWithWarning
        open={showDeleteConfirmation}
        handleVisibilityChange={setShowDeleteConfirmation}
        loading={loading}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete this SMS template."
        handleContinue={onDeleteConfirmation}
        hasWarning={false}
      />
    </>
  )
}
