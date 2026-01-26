"use client"

import React from "react"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { Voucher } from "@/types/voucher"
import { deleteOneVoucher } from "@/app/actions/discount.action"
import { Button } from "@/components/ui/button"
import { BinIcon } from "@/components/icons"
import { useRouter } from "next/navigation"

type VoucherActionsProps<TData extends Voucher> = {
  row: Row<TData>
}

export function VoucherRecordActions({
  row,
}: VoucherActionsProps<Voucher>) {
  const [showDeleteConfirmation, setShowDelConfirmation] =
    React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // ==== VOUCHER DATA ROW ==== //
  const voucher = row.original

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value)
  }

  const onDeleteConfirmation = async () => {
    if (voucher.id) {
      try {
        setLoading(true)
        const result = await deleteOneVoucher(voucher.id)

        toast({
          variant: result.success ? "success" : "destructive",
          title: result.success ? "Success" : "Error",
          description:
            result.message || "Voucher was deleted successfully.",
        })

        if (result.success) {
          router.refresh()
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error.message ?? "Voucher deletion unsuccessful.",
        })
      } finally {
        setLoading(false)
        showHideDeleteModal(false)
      }
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Voucher id not found.",
      })
    }
  }

  return (
    <>
      <DataTableRowActions>
        <Button
          variant="link"
          className="w-fit h-fit p-1 active:scale-95 transition duration-75 cursor-pointer"
          onClick={() => showHideDeleteModal(true)}
        >
          <BinIcon className="w-5 h-5 text-red-600" />
          <span className="sr-only">Remove</span>
        </Button>
      </DataTableRowActions>

      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={showHideDeleteModal}
        loading={loading}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete this voucher and remove the data from our servers."
        handleContinue={onDeleteConfirmation}
      />
    </>
  )
}
