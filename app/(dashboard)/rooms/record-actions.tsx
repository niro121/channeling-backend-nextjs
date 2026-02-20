"use client"

import React from "react"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import CustomAlertDialogWithWarning from "@/components/common/custom-alert-dialog-with-warning"
import { Room } from "@/types/room"
import { deleteRoom, checkRoomHasLinkedRecords } from "@/app/actions/room.actions"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/components/hooks/use-permissions"

type RoomActionsProps<TData extends Room> = {
  row: Row<TData>
}

export function RoomRecordActions({ row }: RoomActionsProps<Room>) {
  const [showDeleteConfirmation, setShowDelConfirmation] =
    React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [fetchingCheck, setFetchingCheck] = React.useState(false)
  const [hasLinkedRecords, setHasLinkedRecords] = React.useState<boolean | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { has } = usePermissions()

  // ==== ROOM DATA ROW ==== //
  const room = row.original

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value)
    if (!value) {
      // Reset check when dialog is closed
      setHasLinkedRecords(null)
    }
  }

  const handleDeleteClick = async () => {
    if (!room.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Room id not found."
      })
      return
    }

    // Fetch check before showing dialog
    setFetchingCheck(true)
    try {
      const result = await checkRoomHasLinkedRecords(room.id)
      if (result.success && result.data) {
        setHasLinkedRecords(result.data.hasLinkedRecords)
        setShowDelConfirmation(true)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error?.message || "Failed to check room linked records."
        })
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to check room linked records."
      })
    } finally {
      setFetchingCheck(false)
    }
  }

  const onDeleteConfirmation = async () => {
    if (room.id) {
      try {
        setLoading(true)
        await deleteRoom(room.id)

        toast({
          variant: "success",
          title: "Success",
          description: "Room was deleted successfully.",
        })
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message ?? "Room deletion unsuccessful.",
        })
      } finally {
        setLoading(false)
        showHideDeleteModal(false)
      }
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Room id not found.",
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
          One or more selected rooms are currently linked to other system records. Deleting them may affect related data and existing associations.

          <br />
          <br />
          Are you sure you want to continue?
        </>
      )
    }

    return "This action cannot be undone. This will permanently delete this room and remove the data from our servers."
  }

  return (
    <>
      <DataTableRowActions>
        {has("rooms", "edit") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/rooms/${room.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}

        {has("rooms", "delete") && (
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
