"use client"

import { useState, useEffect } from "react"
import { getMyDefaultLocationForShiftAction } from "@/app/actions/shift.actions"
import { StartShiftDialog } from "./channel-booking/start-shift-dialog"
import { usePermissions } from "@/components/hooks/use-permissions"

const SHOW_START_SHIFT_DIALOG_EVENT = "channel-booking:show-start-shift-dialog"

type GlobalStartShiftDialogProps = {
  shiftMaxHours: number
}

export function GlobalStartShiftDialog({ shiftMaxHours }: GlobalStartShiftDialogProps) {
  const { has: hasPermission } = usePermissions()
  const hasShiftPermission = hasPermission("shift", "view")
  const [open, setOpen] = useState(false)
  const [location, setLocation] = useState<{ locationId: string; locationName: string } | null>(null)

  useEffect(() => {
    if (!hasShiftPermission) return
    const onShow = () => setOpen(true)
    window.addEventListener(SHOW_START_SHIFT_DIALOG_EVENT, onShow)
    return () => window.removeEventListener(SHOW_START_SHIFT_DIALOG_EVENT, onShow)
  }, [hasShiftPermission])

  useEffect(() => {
    if (!open || !hasShiftPermission) return
    getMyDefaultLocationForShiftAction().then(setLocation)
  }, [open, hasShiftPermission])

  if (!hasShiftPermission) return null

  return (
    <StartShiftDialog
      open={open}
      shiftMaxHours={shiftMaxHours}
      location={location}
      onStarted={() => setOpen(false)}
      onSkipped={() => setOpen(false)}
    />
  )
}
