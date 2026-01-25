"use client"

import React from "react"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { Room } from "@/types/room"
import { deleteRoom } from "@/app/actions/room.actions"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import { BinIcon } from "@/components/icons"
import { useRouter } from "next/navigation"

type RoomActionsProps<TData extends Room> = {
  row: Row<TData>
}

export function RoomRecordActions({ row }: RoomActionsProps<Room>) {
  const [showDeleteConfirmation, setShowDelConfirmation] =
    React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // ==== ROOM DATA ROW ==== //
  const room = row.original

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value)
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

  return (
    <>
      <DataTableRowActions>
        <Button
          variant="link"
          className="w-fit h-fit p-1 active:scale-95 transition duration-75 cursor-pointer"
          onClick={() => router.push(`/rooms/${room.id}/edit`)}
        >
          <Edit className="w-5 h-5" />
          <span className="sr-only">Edit</span>
        </Button>

        <Button
          variant="link"
          className="w-fit h-fit p-1 active:scale-95 transition duration-75 cursor-pointer"
          onClick={() => showHideDeleteModal(true)}
        >
          <BinIcon className="w-5 h-5 text-red-600" />
          <span className="sr-only">Delete</span>
        </Button>
      </DataTableRowActions>

      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={showHideDeleteModal}
        loading={loading}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete this room and remove the data from our servers."
        handleContinue={onDeleteConfirmation}
      />
    </>
  )
}
