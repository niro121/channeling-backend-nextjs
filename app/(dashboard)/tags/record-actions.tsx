"use client"

import React, { useState } from "react"
import { Tag } from "@/types/tag"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { deleteTag } from "@/app/actions/tag.actions"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import { BinIcon } from "@/components/icons"
import { useRouter } from "next/navigation"

interface TagActionsProps<TData extends Tag> {
  row: Row<TData>
}

const TagRecordActions = <TData extends Tag>({
  row,
}: TagActionsProps<TData>) => {
  const [showDeleteConfirmation, setShowDelConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const tag = row.original

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value)
  }

  const onDeleteConfirmation = async () => {
    if (tag.id) {
      try {
        setLoading(true)
        await deleteTag(tag.id)

        toast({
          variant: "success",
          title: "Success",
          description: "Tag was deleted successfully.",
        })
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message ?? "Tag deletion unsuccessful.",
        })
      } finally {
        setLoading(false)
        showHideDeleteModal(false)
      }
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Tag id not found.",
      })
    }
  }

  return (
    <>
      <DataTableRowActions>
        <Button
          variant="link"
          className="w-fit h-fit p-1 active:scale-95 transition duration-75 cursor-pointer"
          onClick={() => router.push(`/tags/${tag.id}/edit`)}
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
        description="This action cannot be undone. This will permanently delete this tag and remove the data from our servers."
        handleContinue={onDeleteConfirmation}
      />
    </>
  )
}

export default TagRecordActions
