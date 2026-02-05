"use client"

import { useState, useEffect } from "react"
import { getCurrentShiftAction } from "@/app/actions/shift.actions"
import { StartShiftDialog } from "./start-shift-dialog"

type ShiftRecord = { id: string; userId: string; startedAt: Date | string; endsAt: Date | string; status: number }

type ShiftGateProps = {
  shiftMaxHours: number
  children: React.ReactNode
}

const SHOW_START_SHIFT_DIALOG_EVENT = "channel-booking:show-start-shift-dialog"

export function ShiftGate({ shiftMaxHours, children }: ShiftGateProps) {
  const [currentShift, setCurrentShift] = useState<ShiftRecord | null>(null)
  const [skipped, setSkipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showStartDialogRequested, setShowStartDialogRequested] = useState(false)

  useEffect(() => {
    let cancelled = false
    getCurrentShiftAction().then((shift: ShiftRecord | null) => {
      if (!cancelled) {
        setCurrentShift(shift)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const openDialog = () => setShowStartDialogRequested(true)
    window.addEventListener(SHOW_START_SHIFT_DIALOG_EVENT, openDialog)
    return () => window.removeEventListener(SHOW_START_SHIFT_DIALOG_EVENT, openDialog)
  }, [])

  const showDialog =
    (!loading && !currentShift && !skipped) || showStartDialogRequested

  const handleStarted = () => {
    setShowStartDialogRequested(false)
    getCurrentShiftAction().then(setCurrentShift)
  }

  const handleSkipped = () => {
    setShowStartDialogRequested(false)
    setSkipped(true)
  }

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    )
  }

  return (
    <>
      <StartShiftDialog
        open={showDialog}
        shiftMaxHours={shiftMaxHours}
        onStarted={handleStarted}
        onSkipped={handleSkipped}
      />
      {children}
    </>
  )
}
