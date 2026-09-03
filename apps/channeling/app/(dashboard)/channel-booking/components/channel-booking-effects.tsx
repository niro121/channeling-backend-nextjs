"use client"

import { useEffect } from "react"
import { getBookingsBySession } from "@/app/actions/channel-booking"
import { useChannelBooking } from "../context/channel-booking-context"

/**
 * Runs data side-effects from context state:
 * - When session selected → fetch bookings for that session.
 */
export function ChannelBookingEffects() {
  const {
    selectedSession,
    setBookings,
    setBookingsLoading,
  } = useChannelBooking()

  useEffect(() => {
    if (!selectedSession?.id) {
      setBookings([])
      setBookingsLoading(false)
      return
    }
    setBookingsLoading(true)
    let cancelled = false
    getBookingsBySession(selectedSession.id).then((res) => {
      if (cancelled) return
      if (res.success && res.data) {
        setBookings(res.data)
      } else {
        setBookings([])
      }
      setBookingsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [selectedSession?.id, setBookings, setBookingsLoading])

  return null
}
