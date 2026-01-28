"use client"

import React, { useState } from "react"
import { Department } from "@/types/department"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { deleteDepartment } from "@/app/actions/department.actions"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import { BinIcon } from "@/components/icons"
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
            variant="link"
            className="w-fit h-fit p-1 active:scale-95 transition duration-75 cursor-pointer"
            onClick={() => router.push(`/departments/${department.id}/edit`)}
          >
            <Edit className="w-5 h-5" />
            <span className="sr-only">Edit</span>
          </Button>
        )}

        {has("departments", "delete") && (
          <Button
            variant="link"
            className="w-fit h-fit p-1 active:scale-95 transition duration-75 cursor-pointer"
            onClick={() => showHideDeleteModal(true)}
          >
            <BinIcon className="w-5 h-5 text-red-600" />
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
