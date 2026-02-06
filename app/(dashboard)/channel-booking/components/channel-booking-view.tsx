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
      <div className="space-y-4 p-4 md:p-6">
        {/* Top row: DoctorSelection | SessionsSelection | Bookings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DoctorSelection />
          <SessionsSelection />
          <Bookings />
        </div>

        {/* Bottom row: Reservation (left) | Information (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Reservation />
          <Information />
        </div>
      </div>
    </ChannelBookingProvider>
  )
}
