"use client"

import React, { useState } from "react"
import { StaffRecord } from "@/types/staff"
import { Row } from "@tanstack/react-table"
import { Button, CustomAlertDialog, DataTableRowActions, useToast } from "@archmage/ui"
import { deleteStaffAction } from "@/app/actions/staff-actions/staff.actions"
import { buildChannelingSyncDialogDescription } from "@/lib/helpers/staff-channeling-dialog.helper"
import { Pencil, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/components/hooks/use-permissions"

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

  const deleteDescription = buildChannelingSyncDialogDescription({
    mode: "delete",
    hasChannelingLink: Boolean(staff.migrateSourceId),
  })

  const onDeleteConfirmation = async () => {
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
      const result = await deleteStaffAction(staff.id, { syncToChanneling: true })

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
          description: staff.migrateSourceId
            ? "Staff was deleted from HRM and Channeling."
            : "Staff was deleted successfully.",
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

  const onDeleteHrmOnly = async () => {
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
      const result = await deleteStaffAction(staff.id, { syncToChanneling: false })

      if (result.isError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.errors?.message ?? "Staff deletion unsuccessful.",
        })
        return
      }

      toast({
        variant: "success",
        title: "Success",
        description: "Staff was deleted from HRM.",
      })
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

  const handleDeleteDialogVisibility = (open: boolean) => {
    if (!open) {
      void onDeleteHrmOnly()
      return
    }
    setShowDelConfirmation(open)
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
      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={handleDeleteDialogVisibility}
        loading={loading}
        title={
          staff.migrateSourceId
            ? 'Delete staff from HRM and Channeling?'
            : 'Delete staff from HRM?'
        }
        description={`${deleteDescription} Click Cancel to delete from HRM only, or Continue to also delete from Channeling.`}
        handleContinue={onDeleteConfirmation}
      />
    </>
  )
}

export default StaffRecordActions
