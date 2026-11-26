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
import { Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"

type CustomAlertDialogWithWarningProps = {
  open: boolean
  title: string
  description: React.ReactNode
  handleVisibilityChange: (value: boolean) => void
  handleContinue: () => void
  loading: boolean
  hasWarning?: boolean
}

const CustomAlertDialogWithWarning = ({
  open,
  title,
  description,
  handleVisibilityChange,
  handleContinue,
  loading,
  hasWarning = false,
}: CustomAlertDialogWithWarningProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription
            className={cn(
              hasWarning && "text-[#d94a4a]"
            )}
          >
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => handleVisibilityChange(false)}
            disabled={loading}
            className={cn(
              "cursor-pointer",
              hasWarning && "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
            )}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleContinue} 
            disabled={loading} 
            className={cn(
              "cursor-pointer gap-2",
              hasWarning && "bg-green-700 hover:bg-green-800 text-white"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Continue
              </>
            ) : (
              "Continue"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default CustomAlertDialogWithWarning
