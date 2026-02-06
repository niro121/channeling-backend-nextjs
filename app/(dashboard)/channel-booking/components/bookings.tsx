"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useChannelBooking } from "../context/channel-booking-context"

export function Bookings() {
  const { selectedSession, bookings, bookingsLoading, selectedBooking, onBookingSelect } =
    useChannelBooking()

  return (
    <Card className="flex flex-col min-h-[320px]">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Bookings</CardTitle>
        <div className="flex gap-1">
          <div className="rounded-md border border-border bg-muted/30 h-8 w-8" />
          <div className="rounded-md border border-border bg-muted/30 h-8 w-8" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-4 pt-0">
        {/* Bookings list – fetched when session selected; selecting fills Information */}
        <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[240px] w-full" />
      </CardContent>
    </Card>
  )
}
