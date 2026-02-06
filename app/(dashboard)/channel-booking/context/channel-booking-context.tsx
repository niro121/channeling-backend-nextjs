"use client"

import React, { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { Doctor } from "@/types/doctor"
import type { Session } from "@/types/session"

/** Placeholder until booking API/types exist. Replace with your real Booking type. */
export type ChannelBookingRecord = {
  id: string
  patientNumber?: number
  patientName?: string
  sessionId?: string
  doctorId?: string
  status?: string
  [key: string]: unknown
}

/** Reservation details derived from selected session (for New Booking Details panel). */
export type ReservationDetails = {
  doctorId: string
  doctorName: string
  sessionId: string
  sessionName: string
  startTime: Date
  endTime: Date
  locationName?: string
  roomName?: string
  amountLocal?: number
  amountForeign?: number
} | null

export type ChannelBookingState = {
  selectedSpecialityId: string | null
  selectedDoctor: Doctor | null
  selectedSession: Session | null
  selectedBooking: ChannelBookingRecord | null
  /** Bookable sessions (Session model) for selected doctor+date, optionally filtered by location. */
  sessions: Session[]
  /** Loading sessions (when date/location change). */
  sessionsLoading: boolean
  /** Bookings for selected session (fetched when session selected). */
  bookings: ChannelBookingRecord[]
  /** Loading bookings for current session. */
  bookingsLoading: boolean
  /** Reservation summary for New Booking Details (from selected session). */
  reservationDetails: ReservationDetails
}

export type ChannelBookingActions = {
  setSelectedSpecialityId: (id: string | null) => void
  setSelectedDoctor: (doctor: Doctor | null) => void
  setSelectedSession: (session: Session | null) => void
  setSelectedBooking: (booking: ChannelBookingRecord | null) => void
  setSessions: (sessions: Session[]) => void
  setSessionsLoading: (loading: boolean) => void
  setBookings: (bookings: ChannelBookingRecord[]) => void
  setBookingsLoading: (loading: boolean) => void
  /** Call when doctor changes: clear session/booking and clear sessions. */
  onDoctorSelect: (doctor: Doctor | null) => void
  /** Call when session changes: clear booking, set reservation details, trigger bookings fetch. */
  onSessionSelect: (session: Session | null) => void
  /** Call when booking is selected: fill information panel. */
  onBookingSelect: (booking: ChannelBookingRecord | null) => void
}

export type ChannelBookingContextValue = ChannelBookingState & ChannelBookingActions

const ChannelBookingContext = createContext<ChannelBookingContextValue | undefined>(undefined)

/** Build start/end Date from Session date + startTime/endTime (minutes from midnight). */
function reservationFromSession(
  doctor: Doctor | null,
  session: Session | null
): ReservationDetails {
  if (!doctor || !session) return null
  const d = session.date instanceof Date ? session.date : new Date(session.date)
  const startTime = new Date(d)
  startTime.setHours(Math.floor(session.startTime / 60), session.startTime % 60, 0, 0)
  const endTime = new Date(d)
  endTime.setHours(Math.floor(session.endTime / 60), session.endTime % 60, 0, 0)
  const sessionName =
    session.location?.name && session.room?.number
      ? `${session.location.name} – ${session.room.number}`
      : session.location?.name ?? "Session"
  return {
    doctorId: doctor.id ?? "",
    doctorName: [doctor.title, doctor.name].filter(Boolean).join(" "),
    sessionId: session.id,
    sessionName,
    startTime,
    endTime,
    locationName: session.location?.name,
    roomName: session.room?.number,
    amountLocal: session.amountLocal ?? undefined,
    amountForeign: session.amountForeign ?? undefined,
  }
}

export function ChannelBookingProvider({ children }: { children: React.ReactNode }) {
  const [selectedSpecialityId, setSelectedSpecialityId] = useState<string | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<ChannelBookingRecord | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [bookings, setBookings] = useState<ChannelBookingRecord[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)

  const onDoctorSelect = useCallback((doctor: Doctor | null) => {
    setSelectedDoctor(doctor)
    setSelectedSession(null)
    setSelectedBooking(null)
    setBookings([])
    setSessions([])
  }, [])

  const onSessionSelect = useCallback((session: Session | null) => {
    setSelectedSession(session)
    setSelectedBooking(null)
    setBookings(session ? [] : []) // Caller or effect will fetch bookings for this session
    setBookingsLoading(!!session)
  }, [])

  const onBookingSelect = useCallback((booking: ChannelBookingRecord | null) => {
    setSelectedBooking(booking)
  }, [])

  const reservationDetails = useMemo(
    () => reservationFromSession(selectedDoctor, selectedSession),
    [selectedDoctor, selectedSession]
  )

  const value = useMemo<ChannelBookingContextValue>(
    () => ({
      selectedSpecialityId,
      selectedDoctor,
      selectedSession,
      selectedBooking,
      sessions,
      sessionsLoading,
      bookings,
      bookingsLoading,
      reservationDetails,
      setSelectedSpecialityId,
      setSelectedDoctor,
      setSelectedSession,
      setSelectedBooking,
      setSessions,
      setSessionsLoading,
      setBookings,
      setBookingsLoading,
      onDoctorSelect,
      onSessionSelect,
      onBookingSelect,
    }),
    [
      selectedSpecialityId,
      selectedDoctor,
      selectedSession,
      selectedBooking,
      sessions,
      sessionsLoading,
      bookings,
      bookingsLoading,
      reservationDetails,
      onDoctorSelect,
      onSessionSelect,
      onBookingSelect,
    ]
  )

  return (
    <ChannelBookingContext.Provider value={value}>
      {children}
    </ChannelBookingContext.Provider>
  )
}

export function useChannelBooking() {
  const ctx = useContext(ChannelBookingContext)
  if (ctx === undefined) {
    throw new Error("useChannelBooking must be used within ChannelBookingProvider")
  }
  return ctx
}
