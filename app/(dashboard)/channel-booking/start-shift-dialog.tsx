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
import { Loader2, Play, SkipForward, MapPin } from "lucide-react"

const OPEN_REQUEST_FLOAT_EVENT = "channel-booking:open-request-float-dialog"

type StartShiftDialogProps = {
  open: boolean
  shiftMaxHours: number
  /** User's default location for this shift (from profile). */
  location: { locationId: string; locationName: string } | null
  onStarted: () => void
  onSkipped: () => void
}

export function StartShiftDialog({ open, shiftMaxHours, location, onStarted, onSkipped }: StartShiftDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleStart() {
    setLoading(true)
    try {
      const shift = await startShiftAction(location?.locationId ?? null)
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
          <DialogDescription asChild>
            <div className="space-y-2">
              {location ? (
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  You are starting a shift from <span className="font-semibold">{location.locationName}</span>.
                </p>
              ) : (
                <p className="text-muted-foreground">You are starting a shift. Set your default location in your profile to see it here.</p>
              )}
              <p className="text-muted-foreground">
                The shift has a {shiftMaxHours}-hour time limit. You can pause or end it anytime from the top bar.
              </p>
            </div>
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
