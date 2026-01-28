"use client"

import React, { useState } from "react"
import { AgencyBook } from "@/types/agencybook"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { deleteAgencyBook } from "@/app/actions/agencybook.actions"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import { BinIcon } from "@/components/icons"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/components/hooks/use-permissions"

interface AgencyBookActionsProps<TData extends AgencyBook> {
  row: Row<TData>
}

const AgencyBookRecordActions = <TData extends AgencyBook>({
  row,
}: AgencyBookActionsProps<TData>) => {
  const [showDeleteConfirmation, setShowDelConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { has } = usePermissions()

  const agencyBook = row.original

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value)
  }

  const onDeleteConfirmation = async () => {
    if (agencyBook.id) {
      try {
        setLoading(true)
        const result = await deleteAgencyBook(agencyBook.id)

        if (result?.isError) {
          throw new Error(result.errors?.message)
        }

        toast({
          variant: "success",
          title: "Success",
          description: "Agency book was deleted successfully.",
        })
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error.message ?? "Agency book deletion unsuccessful.",
        })
      } finally {
        setLoading(false)
        showHideDeleteModal(false)
      }
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Agency book id not found.",
      })
    }
  }

  return (
    <>
      <DataTableRowActions>
        {has("agency-books", "edit") && (
          <Button
            variant="link"
            className="w-fit h-fit p-1 active:scale-95 transition duration-75 cursor-pointer"
            onClick={() =>
              router.push(`/agency-books/${agencyBook.id}/edit`)
            }
          >
            <Edit className="w-5 h-5" />
            <span className="sr-only">Edit</span>
          </Button>
        )}

        {has("agency-books", "delete") && (
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
        description="This action cannot be undone. This will permanently delete this agency book and remove the data from our servers."
        handleContinue={onDeleteConfirmation}
      />
    </>
  )
}

export default AgencyBookRecordActions
