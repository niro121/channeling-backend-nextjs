"use client"

import React, { useState } from "react"
import { Roster } from "@/types/roster"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { deleteRoster } from "@/app/actions/roster.actions"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import { BinIcon } from "@/components/icons"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/components/hooks/use-permissions"

interface RosterActionsProps<TData extends Roster> {
  row: Row<TData>
}

const RosterRecordActions = <TData extends Roster>({
  row,
}: RosterActionsProps<TData>) => {
  const [showDeleteConfirmation, setShowDelConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { has } = usePermissions()

  const roster = row.original

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value)
  }

  const onDeleteConfirmation = async () => {
    if (roster.id) {
      try {
        setLoading(true)
        await deleteRoster(roster.id)

        toast({
          variant: "success",
          title: "Success",
          description: "Roster was deleted successfully.",
        })
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message ?? "Roster deletion unsuccessful.",
        })
      } finally {
        setLoading(false)
        showHideDeleteModal(false)
      }
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Roster id not found.",
      })
    }
  }

  return (
    <>
      <DataTableRowActions>
        {has("rosters", "edit") && (
          <Button
            variant="link"
            className="w-fit h-fit p-1 active:scale-95 transition duration-75 cursor-pointer"
            onClick={() => router.push(`/rosters/${roster.id}/edit`)}
          >
            <Edit className="w-5 h-5" />
            <span className="sr-only">Edit</span>
          </Button>
        )}

        {has("rosters", "delete") && (
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
        description="This action cannot be undone. This will permanently delete this roster and remove the data from our servers."
        handleContinue={onDeleteConfirmation}
      />
    </>
  )
}

export default RosterRecordActions
