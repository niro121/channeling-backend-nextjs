"use client"

import React from "react"
import { Button } from "../ui/button"
import { Plus } from "lucide-react"
import { CustomDialog } from "./custom-dialog"

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
        className="gap-1.5 h-9 cursor-pointer"
      >
        <Plus className="h-4 w-4" />
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
