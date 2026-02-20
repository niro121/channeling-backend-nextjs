"use client"

import React, { useState } from "react"
import { Zone } from "@/types/zone"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import CustomAlertDialogWithWarning from "@/components/common/custom-alert-dialog-with-warning"
import { deleteZone, checkZoneHasLinkedRecords } from "@/app/actions/zone.actions"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/components/hooks/use-permissions"

interface ZoneActionsProps<TData extends Zone> {
  row: Row<TData>
}

const ZoneRecordActions = <TData extends Zone>({
  row,
}: ZoneActionsProps<TData>) => {
  const [showDeleteConfirmation, setShowDelConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchingCheck, setFetchingCheck] = useState(false)
  const [hasLinkedRecords, setHasLinkedRecords] = useState<boolean | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { has } = usePermissions()

  const zone = row.original

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value)
    if (!value) {
      // Reset check when dialog is closed
      setHasLinkedRecords(null)
    }
  }

  const handleDeleteClick = async () => {
    if (!zone.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Zone id not found."
      })
      return
    }

    // Fetch check before showing dialog
    setFetchingCheck(true)
    try {
      const result = await checkZoneHasLinkedRecords(zone.id)
      if (result.success && result.data) {
        setHasLinkedRecords(result.data.hasLinkedRecords)
        setShowDelConfirmation(true)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error?.message || "Failed to check zone linked records."
        })
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to check zone linked records."
      })
    } finally {
      setFetchingCheck(false)
    }
  }

  const onDeleteConfirmation = async () => {
    if (zone.id) {
      try {
        setLoading(true)
        await deleteZone(zone.id)

        toast({
          variant: "success",
          title: "Success",
          description: "Zone was deleted successfully.",
        })
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message ?? "Zone deletion unsuccessful.",
        })
      } finally {
        setLoading(false)
        showHideDeleteModal(false)
      }
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Zone id not found.",
      })
    }
  }

  // Generate description component based on check result
  const getDeleteDescription = () => {
    if (hasLinkedRecords === null) {
      return <span>Loading...</span>
    }

    if (hasLinkedRecords) {
      return (
        <>
          One or more selected zones are currently linked to other system records. Deleting them may affect related data and existing associations.

          <br />
          <br />
          Are you sure you want to continue?
        </>
      )
    }

    return "This action cannot be undone. This will permanently delete this zone and remove the data from our servers."
  }

  return (
    <>
      <DataTableRowActions>
        {has("zones", "edit") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/zones/${zone.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}

        {has("zones", "delete") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            onClick={handleDeleteClick}
            disabled={fetchingCheck}
          >
            {fetchingCheck ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </DataTableRowActions>

      <CustomAlertDialogWithWarning
        open={showDeleteConfirmation}
        handleVisibilityChange={showHideDeleteModal}
        loading={loading}
        title="Are you absolutely sure?"
        description={getDeleteDescription()}
        handleContinue={onDeleteConfirmation}
        hasWarning={hasLinkedRecords === true}
      />
    </>
  )
}

export default ZoneRecordActions
