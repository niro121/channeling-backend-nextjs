"use client"

import React, { useState } from "react"
import { Row } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { deleteApiClient } from "@/app/actions/api-client.actions"
import { Pencil, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/components/hooks/use-permissions"
import { useToast } from "@/components/hooks/use-toast"
import type { ApiClient } from "@/types/api-client"

interface ApiClientRecordActionsProps<TData extends ApiClient> {
  row: Row<TData>
}

function ApiClientRecordActions<TData extends ApiClient>({ row }: ApiClientRecordActionsProps<TData>) {
  const router = useRouter()
  const { toast } = useToast()
  const { has } = usePermissions()
  const client = row.original
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)

  const onDeleteConfirmation = async () => {
    try {
      setLoading(true)
      const result = await deleteApiClient(client.id)
      if (!result.success) {
        throw new Error(result.message ?? "Failed to delete API client")
      }
      toast({
        variant: "success",
        title: "Success",
        description: "API client was deleted successfully",
      })
      setShowDeleteConfirmation(false)
      router.refresh()
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Delete unsuccessful",
      })
    } finally {
      setLoading(false)
    }
  }

  const hasEdit = has("api-clients", "edit")
  const hasDelete = has("api-clients", "delete")
  if (!hasEdit && !hasDelete) return null

  return (
    <>
      <DataTableRowActions>
        {hasEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/admin/api-clients/${client.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}
        {hasDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDeleteConfirmation(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </DataTableRowActions>
      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={setShowDeleteConfirmation}
        loading={loading}
        title="Delete API client?"
        description="This will permanently remove this API client. Applications using this client_id will no longer be able to obtain tokens or call the public API."
        handleContinue={onDeleteConfirmation}
      />
    </>
  )
}

export default ApiClientRecordActions
