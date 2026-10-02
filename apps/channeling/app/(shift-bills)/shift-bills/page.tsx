"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getCurrentShiftAction } from "@/app/actions/shift.actions"
import { ShiftBillsGallery } from "@/components/shift-bills/shift-bills-gallery"
import { SHIFT_STATUS } from "@/types/shift"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

type CurrentShift = Awaited<ReturnType<typeof getCurrentShiftAction>>

export default function ShiftBillsPage() {
  const [shift, setShift] = useState<CurrentShift | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      getCurrentShiftAction()
        .then((result) => {
          if (!cancelled) setShift(result)
        })
        .catch(() => {
          if (!cancelled) setShift(null)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    load()
    const interval = setInterval(load, 15000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!shift) {
    return (
      <Alert>
        <AlertTitle>No open shift</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>Start a shift from Channel Booking before photographing bills.</p>
          <Button asChild size="sm">
            <Link href="/channel-booking">Open Channel Booking</Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const canUpload = shift.status === SHIFT_STATUS.ACTIVE
  const lockedReason =
    shift.status === SHIFT_STATUS.PAUSED
      ? {
          title: "Shift paused",
          body: "Resume your shift from Channel Booking before photographing bills.",
        }
      : shift.status === SHIFT_STATUS.HANDOVER_PENDING
        ? {
            title: "Handover pending",
            body: "You can view photos, but new uploads are locked until the handover is cancelled or completed.",
          }
        : null

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Photos attach when you submit handover.
      </p>
      {lockedReason && (
        <Alert>
          <AlertTitle>{lockedReason.title}</AlertTitle>
          <AlertDescription>{lockedReason.body}</AlertDescription>
        </Alert>
      )}
      <ShiftBillsGallery
        key={shift.id}
        shiftId={shift.id}
        canUpload={canUpload}
        emptyHint={canUpload ? "Tap the camera to photograph a bill." : "No bill photos on this shift yet."}
      />
    </div>
  )
}
