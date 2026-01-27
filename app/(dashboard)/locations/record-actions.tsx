"use client"

import React from "react"
import { Location } from "@/types/location"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { deleteLocation } from "@/app/actions/location.action"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import { BinIcon } from "@/components/icons"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/components/hooks/use-permissions"

type LocationActionsProps<TData extends Location> = {
  row: Row<TData>
}

export function LocationRecordActions({
  row,
}: LocationActionsProps<Location>) {
  const [showDeleteConfirmation, setShowDelConfirmation] =
    React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { has } = usePermissions()

  // ==== LOCATION DATA ROW ==== //
  const location = row.original

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value)
  }

  const onDeleteConfirmation = async () => {
    if (location.id) {
      try {
        setLoading(true)
        await deleteLocation(location.id)

        toast({
          variant: "success",
          title: "Success",
          description: "Location was deleted successfully.",
        })
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error.message ?? "Location deletion unsuccessful.",
        })
      } finally {
        setLoading(false)
        showHideDeleteModal(false)
      }
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Location id not found.",
      })
    }
  }

  return (
    <>
      <DataTableRowActions>
        {has("locations", "edit") && (
          <Button
            variant="link"
            className="w-fit h-fit p-1 active:scale-95 transition duration-75 cursor-pointer"
            onClick={() =>
              router.push(`/locations/${location.id}/edit`)
            }
          >
            <Edit className="w-5 h-5" />
            <span className="sr-only">Edit</span>
          </Button>
        )}

        {has("locations", "delete") && (
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
        description="This action cannot be undone. This will permanently delete this location and remove the data from our servers."
        handleContinue={onDeleteConfirmation}
      />
    </>
  )
}
