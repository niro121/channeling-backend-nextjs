"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { getChannelBookingInitialData } from "@/app/actions/channel-booking"
import type { ChannelBookingDoctorOption } from "@/services/channel-booking"
import type { Session } from "@/types/booking.dashboard"
import type { ChannelBookingInitialData } from "@/services/channel-booking/get-initial-data.service"

/** Booking record for list panel (and selection). */
export type ChannelBookingRecord = {
  id: string
  appointmentNo: number
  title: string
  name: string
  status: number
  method: number
  methodName: string
  agencyRef: string | null
  staffId: string | null
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
  /** Specialities, doctors, locations – fetched once on mount (one POST). */
  initialData: ChannelBookingInitialData | null
  initialDataLoading: boolean
  selectedSpecialityId: string | null
  selectedDoctor: ChannelBookingDoctorOption | null
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
  /** Increment to force Booking tab to refetch details (e.g. after settle). */
  bookingDetailsRefreshKey: number
  /** Active tab in the Information panel (e.g. "booking", "settle"). */
  activeInformationTab: string
  /** Selected agency id (when payment method is Agent). Used by Agent Book tab to show agency details. */
  selectedAgencyId: string | null
}

export type ChannelBookingActions = {
  setSelectedSpecialityId: (id: string | null) => void
  setSelectedDoctor: (doctor: ChannelBookingDoctorOption | null) => void
  setSelectedSession: (session: Session | null) => void
  setSelectedBooking: (booking: ChannelBookingRecord | null) => void
  setActiveInformationTab: (tab: string) => void
  setSelectedAgencyId: (id: string | null) => void
  setSessions: (sessions: Session[]) => void
  /** Merge a partial update for one session (e.g. from real-time session-update). */
  updateSessionInList: (sessionId: string, update: Partial<Pick<Session, "appointmentNo" | "paidCount" | "pendingCount">>) => void
  setSessionsLoading: (loading: boolean) => void
  setBookings: (bookings: ChannelBookingRecord[]) => void
  setBookingsLoading: (loading: boolean) => void
  /** Call when doctor changes: clear session/booking and clear sessions. */
  onDoctorSelect: (doctor: ChannelBookingDoctorOption | null) => void
  /** Call when session changes: clear booking, set reservation details, trigger bookings fetch. */
  onSessionSelect: (session: Session | null) => void
  /** Call when booking is selected: fill information panel. */
  onBookingSelect: (booking: ChannelBookingRecord | null) => void
  /** Bump to force information panel (e.g. Booking tab) to refetch. */
  refreshBookingDetails: () => void
}

export type ChannelBookingContextValue = ChannelBookingState & ChannelBookingActions

const ChannelBookingContext = createContext<ChannelBookingContextValue | undefined>(undefined)

/** Build start/end Date from Session (startTime/endTime are DateTime or legacy number). */
function reservationFromSession(
  doctor: ChannelBookingDoctorOption | null,
  session: Session | null
): ReservationDetails {
  if (!doctor || !session) return null
  const d = session.date instanceof Date ? session.date : new Date(session.date)
  const startTime =
    session.startTime instanceof Date
      ? session.startTime
      : (() => {
          const n = Number(session.startTime)
          if (n >= 1e9 && n < 1e13) return new Date(n * 1000)
          const t = new Date(d)
          t.setUTCHours(Math.floor(n / 60), n % 60, 0, 0)
          return t
        })()
  const endTime =
    session.endTime instanceof Date
      ? session.endTime
      : (() => {
          const n = Number(session.endTime)
          if (n >= 1e9 && n < 1e13) return new Date(n * 1000)
          const t = new Date(d)
          t.setUTCHours(Math.floor(n / 60), n % 60, 0, 0)
          return t
        })()
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
  const [initialData, setInitialData] = useState<ChannelBookingInitialData | null>(null)
  const [initialDataLoading, setInitialDataLoading] = useState(true)
  const [selectedSpecialityId, setSelectedSpecialityId] = useState<string | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<ChannelBookingDoctorOption | null>(null)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<ChannelBookingRecord | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [bookings, setBookings] = useState<ChannelBookingRecord[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingDetailsRefreshKey, setBookingDetailsRefreshKey] = useState(0)
  const [activeInformationTab, setActiveInformationTab] = useState("booking")
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getChannelBookingInitialData().then((res) => {
      if (cancelled) return
      if (res.success && res.data) setInitialData(res.data)
      setInitialDataLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const refreshBookingDetails = useCallback(() => {
    setBookingDetailsRefreshKey((k) => k + 1)
  }, [])

  const onDoctorSelect = useCallback((doctor: ChannelBookingDoctorOption | null) => {
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

  const updateSessionInList = useCallback(
    (sessionId: string, update: Partial<Pick<Session, "appointmentNo" | "paidCount" | "pendingCount">>) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, ...update } : s))
      )
    },
    []
  )

  const reservationDetails = useMemo(
    () => reservationFromSession(selectedDoctor, selectedSession),
    [selectedDoctor, selectedSession]
  )

  const value = useMemo<ChannelBookingContextValue>(
    () => ({
      initialData,
      initialDataLoading,
      selectedSpecialityId,
      selectedDoctor,
      selectedSession,
      selectedBooking,
      sessions,
      sessionsLoading,
      bookings,
      bookingsLoading,
      reservationDetails,
      bookingDetailsRefreshKey,
      activeInformationTab,
      selectedAgencyId,
      setSelectedSpecialityId,
      setActiveInformationTab,
      setSelectedAgencyId,
      setSelectedDoctor,
      setSelectedSession,
      setSelectedBooking,
      setSessions,
      updateSessionInList,
      setSessionsLoading,
      setBookings,
      setBookingsLoading,
      onDoctorSelect,
      onSessionSelect,
      onBookingSelect,
      refreshBookingDetails,
    }),
    [
      initialData,
      initialDataLoading,
      selectedSpecialityId,
      selectedDoctor,
      selectedSession,
      selectedBooking,
      sessions,
      sessionsLoading,
      bookings,
      bookingsLoading,
      reservationDetails,
      bookingDetailsRefreshKey,
      activeInformationTab,
      selectedAgencyId,
      updateSessionInList,
      onDoctorSelect,
      onSessionSelect,
      onBookingSelect,
      refreshBookingDetails,
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
