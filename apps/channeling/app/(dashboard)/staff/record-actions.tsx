"use client"

import React, { useState } from "react"
import { Staff } from "@/types/staff"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { deleteStaffAction } from "@/app/actions/staff.actions"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/components/hooks/use-permissions"

interface StaffRecordActionsProps<TData extends Staff> {
  row: Row<TData>
}

function StaffRecordActions<TData extends Staff>({ row }: StaffRecordActionsProps<TData>) {
  const [showDeleteConfirmation, setShowDelConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { has } = usePermissions()
  const staff = row.original

  const onDeleteConfirmation = async () => {
    if (staff.id) {
      try {
        setLoading(true)
        await deleteStaffAction(staff.id)
        toast({
          variant: "success",
          title: "Success",
          description: "Staff was deleted successfully.",
        })
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
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Staff id not found.",
      })
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
      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={setShowDelConfirmation}
        loading={loading}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete this staff member and remove the data from our servers."
        handleContinue={onDeleteConfirmation}
      />
    </>
  )
}

export default StaffRecordActions
