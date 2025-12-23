"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "@/components/icons"
import { CustomDialog } from "@/components/common/custom-dialog"

type AddBtnProps = {
  children: React.ReactNode
  dialogTitle: string
}

export function AddBtn({
  children,
  dialogTitle
}: AddBtnProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        size="sm"
        className="gap-1 px-8 text-white transition-colors ease-in-out duration-100 hover:text-black"
      >
        <PlusCircle />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          Add New
        </span>
      </Button>
      <CustomDialog
        open={dialogOpen}
        setOpen={setDialogOpen}
        title={dialogTitle}
      // width="800px"
      >
        {children}
      </CustomDialog>
    </>
  )
}
