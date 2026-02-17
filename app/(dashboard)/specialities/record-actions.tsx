"use client"

import React from "react"
import { Speciality } from "@/types/speciality"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { deleteSpeciality, getDoctorCountBySpecialityId } from "@/app/actions/speciality.actions"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/components/hooks/use-permissions"

type SpecialityActionsProps<TData extends Speciality> = {
  row: Row<TData>
}

export function SpecialityRecordActions({
  row,
}: SpecialityActionsProps<Speciality>) {
  const [showDeleteConfirmation, setShowDelConfirmation] =
    React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [fetchingCount, setFetchingCount] = React.useState(false)
  const [doctorCount, setDoctorCount] = React.useState<number | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { has } = usePermissions()

  // ==== SPECIALITY DATA ROW ==== //
  const speciality = row.original

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value)
    if (!value) {
      // Reset count when dialog is closed
      setDoctorCount(null)
    }
  }

  const handleDeleteClick = async () => {
    if (!speciality.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Speciality id not found.",
      })
      return
    }

    // Fetch doctor count before showing dialog
    setFetchingCount(true)
    try {
      const result = await getDoctorCountBySpecialityId(speciality.id)
      if (result.success) {
        setDoctorCount(result.data ?? 0)
        setShowDelConfirmation(true)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error?.message || "Failed to fetch doctor count.",
        })
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch doctor count.",
      })
    } finally {
      setFetchingCount(false)
    }
  }

  const onDeleteConfirmation = async () => {
    if (speciality.id) {
      try {
        setLoading(true)
        await deleteSpeciality(speciality.id)

        toast({
          variant: "success",
          title: "Success",
          description: "Speciality was deleted successfully.",
        })
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message ?? "Speciality deletion unsuccessful.",
        })
      } finally {
        setLoading(false)
        showHideDeleteModal(false)
      }
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Speciality id not found.",
      })
    }
  }

  // Generate description based on doctor count
  const getDeleteDescription = () => {
    if (doctorCount === null) {
      return "Loading..."
    }

    if (doctorCount > 0) {
      return `One or more of the selected specialties are assigned to ${doctorCount} doctor(s). If you proceed, the association will be removed from all related records, and the affected doctor profiles must be updated separately.\n\nAre you sure you want to continue?`
    }

    return "This action cannot be undone. This will permanently delete this speciality and remove the data from our servers."
  }

  return (
    <>
      <DataTableRowActions>
        {has("specialities", "edit") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => router.push(`/specialities/${speciality.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}

        {has("specialities", "delete") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            onClick={handleDeleteClick}
            disabled={fetchingCount}
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
        description={getDeleteDescription()}
        handleContinue={onDeleteConfirmation}
      />
    </>
  )
}
