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
import { cn } from "@/lib/utils"

type CustomAlertDialogProps = {
  open: boolean
  title: string
  description: string
  handleVisibilityChange: (value: boolean) => void
  handleContinue: () => void
  loading: boolean
  hasWarning?: boolean
}

const CustomAlertDialog = ({
  open,
  title,
  description,
  handleVisibilityChange,
  handleContinue,
  loading,
  hasWarning = false,
}: CustomAlertDialogProps) => {
  // Format description to make doctor count bold
  const formatDescription = (text: string) => {
    if (!hasWarning) return text;
    
    // Match patterns like "2 doctor(s)" or "02 doctor(s)" and make them bold
    const formattedText = text.replace(
      /(\d+)\s+doctor\(s\)/gi,
      '<strong style="font-weight: 700;">$1 doctor(s)</strong>'
    );
    
    return formattedText;
  };

  const formattedDescription = formatDescription(description);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {hasWarning ? (
            <AlertDialogDescription
              className={cn(
                "text-[#d94a4a] whitespace-pre-line [&_strong]:font-bold"
              )}
              dangerouslySetInnerHTML={{ __html: formattedDescription }}
            />
          ) : (
            <AlertDialogDescription>
              {description}
            </AlertDialogDescription>
          )}
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

export default CustomAlertDialog
