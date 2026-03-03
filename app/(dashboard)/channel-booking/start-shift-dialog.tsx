"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { startShiftAction } from "@/app/actions/shift.actions"
import { useToast } from "@/components/hooks/use-toast"
import { Loader2, Play, SkipForward } from "lucide-react"

const OPEN_REQUEST_FLOAT_EVENT = "channel-booking:open-request-float-dialog"

type StartShiftDialogProps = {
  open: boolean
  shiftMaxHours: number
  onStarted: () => void
  onSkipped: () => void
}

export function StartShiftDialog({ open, shiftMaxHours, onStarted, onSkipped }: StartShiftDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleStart() {
    setLoading(true)
    try {
      const shift = await startShiftAction()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("channel-booking:shift-started"))
        window.dispatchEvent(
          new CustomEvent(OPEN_REQUEST_FLOAT_EVENT, {
            detail: { shiftId: (shift as { id: string })?.id ?? null },
          })
        )
      }
      onStarted()
      toast({ title: "Shift started", description: `Your shift is active for up to ${shiftMaxHours} hours.` })
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to start shift", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Start your shift</DialogTitle>
          <DialogDescription>
            Start a channel-booking shift to track your session. The shift has a {shiftMaxHours}-hour time limit. You can pause or end it anytime from the top bar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onSkipped} disabled={loading}>
            <SkipForward className="h-4 w-4 mr-2" />
            Skip
          </Button>
          <Button type="button" onClick={handleStart} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Start shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
