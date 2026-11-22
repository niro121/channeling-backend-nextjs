"use client"

import React, { useState } from "react"
import { StaffRecord } from "@/types/staff"
import { Row } from "@tanstack/react-table"
import { Button, DataTableRowActions, useToast } from "@archmage/ui"
import { deleteStaffAction } from "@/app/actions/staff-actions/staff.actions"
import { ChannelingSyncAlertDialog } from "@/components/common/channeling-sync-alert-dialog"
import { buildChannelingSyncDialog } from "@/components/common/channeling-sync-dialog.helper"
import { Pencil, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/components/hooks/use-permissions"
import { buttonStyles } from "@/lib/utils/common-styles"

interface StaffRecordActionsProps<TData extends StaffRecord> {
  row: Row<TData>
}

function StaffRecordActions<TData extends StaffRecord>({ row }: StaffRecordActionsProps<TData>) {
  const [showDeleteConfirmation, setShowDelConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { has } = usePermissions()
  const staff = row.original
  const hasChannelingLink = Boolean(staff.migrateSourceId)

  const deleteDialog = buildChannelingSyncDialog({
    entityLabel: "staff member",
    mode: "delete",
    hasChannelingLink,
  })

  const onDelete = async (syncToChanneling: boolean) => {
    if (!staff.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Staff id not found.",
      })
      return
    }

    try {
      setLoading(true)
      const result = await deleteStaffAction(staff.id, { syncToChanneling })

      if (result.isError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.errors?.message ?? "Staff deletion unsuccessful.",
        })
        return
      }

      if (result.data?.channelingWarning) {
        toast({
          variant: "destructive",
          title: "Channeling sync warning",
          description: result.data.channelingWarning,
        })
      } else {
        toast({
          variant: "success",
          title: "Success",
          description: syncToChanneling
            ? "Staff was deleted from HRM and Channeling."
            : "Staff was deleted from HRM.",
        })
      }

      router.refresh()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message ?? "Staff deletion unsuccessful.",
      })
    } finally {
      setLoading(false)
      setShowDelConfirmation(false)
    }
  }

  return (
    <>
      <DataTableRowActions>
        {has("staff", "edit") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/staff/${staff.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}
        {has("staff", "delete") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDelConfirmation(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </DataTableRowActions>
      <ChannelingSyncAlertDialog
        open={showDeleteConfirmation}
        title={deleteDialog.title}
        description={deleteDialog.description}
        hrmOnlyLabel={deleteDialog.hrmOnlyLabel}
        continueLabel={deleteDialog.continueLabel}
        showContinue={hasChannelingLink}
        hrmOnlyClassName={buttonStyles.delete.danger}
        continueClassName={buttonStyles.delete.danger}
        loading={loading}
        onCancel={() => setShowDelConfirmation(false)}
        onSaveHrmOnly={() => void onDelete(false)}
        onContinue={() => void onDelete(true)}
      />
    </>
  )
}

export default StaffRecordActions
