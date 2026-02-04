"use client"

import React, { useState } from "react"
import { Department } from "@/types/department"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { deleteDepartment } from "@/app/actions/department.actions"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/components/hooks/use-permissions"

interface DepartmentActionsProps<TData extends Department> {
  row: Row<TData>
}

const DepartmentRecordActions = <TData extends Department>({
  row,
}: DepartmentActionsProps<TData>) => {
  const [showDeleteConfirmation, setShowDelConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { has } = usePermissions()

  const department = row.original

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value)
  }

  const onDeleteConfirmation = async () => {
    if (department.id) {
      try {
        setLoading(true)
        await deleteDepartment(department.id)

        toast({
          variant: "success",
          title: "Success",
          description: "Department was deleted successfully.",
        })
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message ?? "Department deletion unsuccessful.",
        })
      } finally {
        setLoading(false)
        showHideDeleteModal(false)
      }
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Department id not found.",
      })
    }
  }

  return (
    <>
      <DataTableRowActions>
        {has("departments", "edit") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/departments/${department.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}

        {has("departments", "delete") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => showHideDeleteModal(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </DataTableRowActions>

      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={showHideDeleteModal}
        loading={loading}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete this department and remove the data from our servers."
        handleContinue={onDeleteConfirmation}
      />
    </>
  )
}

export default DepartmentRecordActions
