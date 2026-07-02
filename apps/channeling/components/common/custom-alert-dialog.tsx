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

type CustomAlertDialogProps = {
  open: boolean
  title: string
  description: string
  handleVisibilityChange: (value: boolean) => void
  handleContinue: () => void
  loading: boolean
}

const CustomAlertDialog = ({
  open,
  title,
  description,
  handleVisibilityChange,
  handleContinue,
  loading,
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
          <AlertDialogAction onClick={handleContinue} disabled={loading} className="relative cursor-pointer">
            Continue {loading && <Spinner />}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default CustomAlertDialog