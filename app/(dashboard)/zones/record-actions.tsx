"use client"

import React, { useState } from "react"
import { Zone } from "@/types/zone"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { deleteZone } from "@/app/actions/zone.actions"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import { BinIcon } from "@/components/icons"
import { useRouter } from "next/navigation"

interface ZoneActionsProps<TData extends Zone> {
  row: Row<TData>
}

const ZoneRecordActions = <TData extends Zone>({
  row,
}: ZoneActionsProps<TData>) => {
  const [showDeleteConfirmation, setShowDelConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const zone = row.original

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value)
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

  return (
    <>
      <DataTableRowActions>
        <Button
          variant="link"
          className="w-fit h-fit p-1 active:scale-95 transition duration-75 cursor-pointer"
          onClick={() => router.push(`/zones/${zone.id}/edit`)}
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
        description="This action cannot be undone. This will permanently delete this zone and remove the data from our servers."
        handleContinue={onDeleteConfirmation}
      />
    </>
  )
}

export default ZoneRecordActions
