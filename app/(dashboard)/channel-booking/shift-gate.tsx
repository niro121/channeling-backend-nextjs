"use client"

import { useState, useEffect } from "react"
import { getCurrentShiftAction, getMyDefaultLocationForShiftAction } from "@/app/actions/shift.actions"
import { StartShiftDialog } from "./start-shift-dialog"
import { useToast } from "@/components/hooks/use-toast"
import { usePermissions } from "@/components/hooks/use-permissions"

type ShiftRecord = { id: string; userId: string; startedAt: Date | string; endsAt: Date | string; status: number }
type LocationForShift = { locationId: string; locationName: string } | null

type ShiftGateProps = {
  shiftMaxHours: number
  children: React.ReactNode
}

const SHOW_START_SHIFT_DIALOG_EVENT = "channel-booking:show-start-shift-dialog"

export function ShiftGate({ shiftMaxHours, children }: ShiftGateProps) {
  const { has: hasPermission } = usePermissions()
  const hasShiftPermission = hasPermission("shift", "view")
  const [currentShift, setCurrentShift] = useState<ShiftRecord | null>(null)
  const [shiftLocation, setShiftLocation] = useState<LocationForShift>(null)
  const [skipped, setSkipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showStartDialogRequested, setShowStartDialogRequested] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!hasShiftPermission) {
      setLoading(false)
      return
    }
    let cancelled = false
    getCurrentShiftAction()
      .then((shift: ShiftRecord | null) => {
        if (!cancelled) {
          setCurrentShift(shift)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoading(false)
          setCurrentShift(null)
          setSkipped(true)
          const message = err instanceof Error ? err.message : "You don’t have permission to use shift features."
          toast({
            title: "Access denied",
            description: message,
            variant: "destructive",
          })
        }
      })
    return () => { cancelled = true }
  }, [hasShiftPermission, toast])

  useEffect(() => {
    const openDialog = () => setShowStartDialogRequested(true)
    window.addEventListener(SHOW_START_SHIFT_DIALOG_EVENT, openDialog)
    return () => window.removeEventListener(SHOW_START_SHIFT_DIALOG_EVENT, openDialog)
  }, [])

  useEffect(() => {
    if (!showDialog || !hasShiftPermission) return
    getMyDefaultLocationForShiftAction().then(setShiftLocation)
  }, [showDialog, hasShiftPermission])

  const showDialog =
    hasShiftPermission && ((!loading && !currentShift && !skipped) || showStartDialogRequested)

  const handleStarted = () => {
    setShowStartDialogRequested(false)
    getCurrentShiftAction()
      .then(setCurrentShift)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load shift."
        toast({
          title: "Access denied",
          description: message,
          variant: "destructive",
        })
      })
  }

  const handleSkipped = () => {
    setShowStartDialogRequested(false)
    setSkipped(true)
  }

  if (hasShiftPermission && loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    )
  }

  return (
    <>
      {hasShiftPermission && (
        <StartShiftDialog
          open={showDialog}
          shiftMaxHours={shiftMaxHours}
          location={shiftLocation}
          onStarted={handleStarted}
          onSkipped={handleSkipped}
        />
      )}
      {children}
    </>
  )
}
