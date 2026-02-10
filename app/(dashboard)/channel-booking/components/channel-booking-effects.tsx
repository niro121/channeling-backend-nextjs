"use client"

import { useEffect } from "react"
import { useChannelBooking } from "../context/channel-booking-context"

/**
 * Runs data side-effects from context state:
 * - Sessions are fetched from SessionsSelection when doctor + date (and optional location) are set (Session model).
 * - When session selected → fetch bookings for that session (placeholder until API exists).
 */
export function ChannelBookingEffects() {
  const {
    selectedSession,
    setBookings,
    setBookingsLoading,
  } = useChannelBooking()

  // Load bookings when session is selected (placeholder – replace with real API)
  useEffect(() => {
    if (!selectedSession?.id) {
      setBookings([])
      setBookingsLoading(false)
      return
    }
    setBookingsLoading(true)
    let cancelled = false
    // TODO: replace with real bookings API, e.g. getBookingsBySessionId(selectedSession.id)
    const timer = setTimeout(() => {
      if (cancelled) return
      setBookings([])
      setBookingsLoading(false)
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [selectedSession?.id, setBookings, setBookingsLoading])

  return null
}
