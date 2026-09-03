"use client"

import { useState, useEffect } from "react"
import { getMyDefaultLocationForShiftAction } from "@/app/actions/shift.actions"
import { StartShiftDialog } from "./channel-booking/start-shift-dialog"
import { usePermissions } from "@/components/hooks/use-permissions"

const SHOW_START_SHIFT_DIALOG_EVENT = "channel-booking:show-start-shift-dialog"

type GlobalStartShiftDialogProps = {
  shiftMaxHours: number
  bulkCashierShiftMaxHours?: number
}

export function GlobalStartShiftDialog({
  shiftMaxHours,
  bulkCashierShiftMaxHours,
}: GlobalStartShiftDialogProps) {
  const { has: hasPermission } = usePermissions()
  const hasShiftPermission = hasPermission("shift", "view")
  const isBulkCashier = hasPermission("bulk-cashier", "bulk-cashier-dashboard")
  const effectiveMaxHours =
    isBulkCashier && bulkCashierShiftMaxHours != null
      ? bulkCashierShiftMaxHours
      : shiftMaxHours
  const [open, setOpen] = useState(false)
  const [location, setLocation] = useState<{ locationId: string; locationName: string } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)

  useEffect(() => {
    if (!hasShiftPermission) return
    const onShow = () => setOpen(true)
    window.addEventListener(SHOW_START_SHIFT_DIALOG_EVENT, onShow)
    return () => window.removeEventListener(SHOW_START_SHIFT_DIALOG_EVENT, onShow)
  }, [hasShiftPermission])

  useEffect(() => {
    if (!open || !hasShiftPermission) return
    let cancelled = false
    setLocationLoading(true)
    setLocation(null)
    getMyDefaultLocationForShiftAction()
      .then((loc) => {
        if (!cancelled) setLocation(loc)
      })
      .finally(() => {
        if (!cancelled) setLocationLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, hasShiftPermission])

  if (!hasShiftPermission) return null

  return (
    <StartShiftDialog
      open={open}
      shiftMaxHours={effectiveMaxHours}
      location={location}
      locationLoading={locationLoading}
      onStarted={() => setOpen(false)}
      onSkipped={() => setOpen(false)}
    />
  )
}
