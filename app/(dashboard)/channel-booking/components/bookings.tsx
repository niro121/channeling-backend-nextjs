"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useChannelBooking } from "../context/channel-booking-context"
import { cn } from "@/lib/utils"
import { FileClock, Mail } from "lucide-react"

export function Bookings() {
  const {
    selectedSession,
    bookings,
    bookingsLoading,
    selectedBooking,
    onBookingSelect,
  } = useChannelBooking()

  const hasSession = !!selectedSession

  return (
    <Card className="flex flex-col min-h-0 h-full">
      <CardContent className="flex flex-col flex-1 min-h-0 p-2 pt-2">
        <div className="flex items-center justify-between shrink-0 mb-1.5">
          <h3 className="font-semibold text-sm">Bookings</h3>
          <div className="flex gap-1">
            <button
              type="button"
              className="h-8 w-8 rounded-md border border-border bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20"
              aria-label="Booking history"
            >
              <FileClock className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="h-8 w-8 rounded-md border border-border bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20"
              aria-label="Email"
            >
              <Mail className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {!hasSession ? (
            <div className="flex flex-1 min-h-0 w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/20 text-sm text-muted-foreground px-2">
              Please select a session
            </div>
          ) : bookingsLoading ? (
            <div className="flex flex-1 min-h-0 w-full items-center justify-center py-8">
              <div
                className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-green-800"
                aria-label="Loading bookings"
              />
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-1 min-h-0 w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/20 text-sm text-muted-foreground px-2">
              No bookings for this session
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thinner border border-border rounded-md">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-muted/80 z-10">
                  <tr>
                    <th className="w-8 px-1.5 py-1.5 text-left">
                      <Checkbox aria-label="Select all" className="h-3.5 w-3.5" />
                    </th>
                    <th className="w-10 px-1.5 py-1.5 text-left font-medium">No</th>
                    <th className="px-1.5 py-1.5 text-left font-medium">Name</th>
                    <th className="px-1.5 py-1.5 text-left font-medium">Paid</th>
                    <th className="px-1.5 py-1.5 text-left font-medium">Agent/Staff</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const isSelected = selectedBooking?.id === b.id
                    const paidLabel =
                      b.status === 1
                        ? `Paid - ${b.methodName}`
                        : `Credit - ${b.methodName}`
                    const displayName = [b.title, b.name].filter(Boolean).join(" ") || "—"
                    const agentStaff = b.agencyRef || b.staffId || "—"
                    return (
                      <tr
                        key={b.id}
                        onClick={() => onBookingSelect(isSelected ? null : b)}
                        className={cn(
                          "border-t border-border cursor-pointer transition-colors",
                          "hover:bg-primary/10",
                          isSelected && "bg-primary/15"
                        )}
                      >
                        <td
                          className="w-8 px-1.5 py-1.5"
                          onClick={(e) => {
                            e.stopPropagation()
                            onBookingSelect(isSelected ? null : b)
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            aria-label={`Select ${displayName}`}
                            className="h-3.5 w-3.5 pointer-events-none"
                          />
                        </td>
                        <td className="w-10 px-1.5 py-1.5 tabular-nums">
                          {b.appointmentNo}
                        </td>
                        <td className="px-1.5 py-1.5 truncate max-w-[120px]">
                          {displayName}
                        </td>
                        <td className="px-1.5 py-1.5">
                          <span
                            className={cn(
                              b.status === 0 && "text-amber-600 font-medium"
                            )}
                          >
                            {paidLabel}
                          </span>
                        </td>
                        <td className="px-1.5 py-1.5 tabular-nums text-muted-foreground">
                          {agentStaff}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
