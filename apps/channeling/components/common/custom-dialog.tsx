"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createContext, useContext } from "react"

type ActionDialogProps = {
  open: boolean
  setOpen: (value: boolean) => void
  title?: string
  width?: string
  children: React.ReactNode
}

// Define the context type.
interface DialogContextType {
  setDialogOpen: (value: boolean) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogContext.Provider");
  }
  return context;
};

// Safe version that returns undefined if context is not available
export const useDialogSafe = () => {
  return useContext(DialogContext);
};

export function CustomDialog({
  open,
  setOpen,
  title,
  children,
}: ActionDialogProps) {
  return (
    <DialogContext.Provider value={{ setDialogOpen: setOpen }}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`sm:max-w-[800px] max-h-screen overflow-auto rounded-sm`}>
          <DialogHeader className="border-b pb-6">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    </DialogContext.Provider>
  )
}