"use client"

import dynamic from "next/dynamic"
import { ChannelBookingProvider } from "../context/channel-booking-context"
import { ChannelBookingEffects } from "./channel-booking-effects"

const DoctorSelection = dynamic(
  () => import("./doctor-selection").then((m) => ({ default: m.DoctorSelection })),
  { ssr: false, loading: () => <CardSkeleton className="min-h-[320px]" /> }
)
const SessionsSelection = dynamic(
  () => import("./sessions-selection").then((m) => ({ default: m.SessionsSelection })),
  { ssr: false, loading: () => <CardSkeleton className="min-h-[320px]" /> }
)
const Bookings = dynamic(
  () => import("./bookings").then((m) => ({ default: m.Bookings })),
  { ssr: false, loading: () => <CardSkeleton className="min-h-[320px]" /> }
)
const Reservation = dynamic(
  () => import("./reservation").then((m) => ({ default: m.Reservation })),
  { ssr: false, loading: () => <CardSkeleton className="min-h-[360px]" /> }
)
const Information = dynamic(
  () => import("./information").then((m) => ({ default: m.Information })),
  { ssr: false, loading: () => <CardSkeleton className="min-h-[360px]" /> }
)

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border border-border bg-muted/20 animate-pulse ${className ?? ""}`}
    />
  )
}

export function ChannelBookingView() {
  return (
    <ChannelBookingProvider>
      <ChannelBookingEffects />
      <div className="flex flex-col min-h-0 h-[calc(100vh-5rem)] -mt-4 -mx-4 -mb-12 sm:-mt-6 sm:-mx-6 sm:-mb-14 pt-2 pb-0 px-2 sm:pt-2 sm:pb-0 sm:px-2 gap-2">
        {/* Top row: DoctorSelection | SessionsSelection | Bookings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 min-h-0 flex-1">
          <DoctorSelection />
          <SessionsSelection />
          <Bookings />
        </div>

        {/* Bottom row: Reservation (left) | Information (right) — fixed 45% viewport height, scroll inside tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 h-[45vh] min-h-0">
          <Reservation />
          <Information />
        </div>
      </div>
    </ChannelBookingProvider>
  )
}
