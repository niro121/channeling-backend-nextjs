"use client"
import React from "react"
//ANCHOR - 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog"
//ANCHOR - 
import { Spinner } from "../icons"
import { cn } from "../../lib/utils"

type CustomAlertDialogProps = {
  open: boolean
  title: string
  description: string
  handleVisibilityChange: (value: boolean) => void
  handleContinue: () => void
  loading: boolean
  className?: {
    actionButton?: string
  }
}

const CustomAlertDialog = ({
  open,
  title,
  description,
  handleVisibilityChange,
  handleContinue,
  loading,
  className,
}: CustomAlertDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => handleVisibilityChange(false)}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleContinue} disabled={loading} className={cn("relative cursor-pointer", className?.actionButton)}>
            Continue {loading && <Spinner />}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default CustomAlertDialog
