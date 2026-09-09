"use client"

import { useEffect, useState } from "react"
import { getAgencyDetailsForChannelBooking } from "@/app/actions/channel-booking"
import type { AgencyDetailsForChannelBooking } from "@/services/channel-booking/reference/get-agency-details-for-channel-booking.service"
import { formatLKR } from "@/lib/format-money"
import { useChannelBooking } from "../../context/channel-booking-context"

export function AgentBookTab() {
  const { selectedAgencyId } = useChannelBooking()
  const [details, setDetails] = useState<AgencyDetailsForChannelBooking | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedAgencyId || typeof selectedAgencyId !== "string") {
      setDetails(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getAgencyDetailsForChannelBooking(selectedAgencyId)
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) {
          setDetails(res.data)
          setError(null)
        } else {
          setDetails(null)
          setError(res.message ?? "Failed to load agency details.")
        }
      })
      .catch((err) => {
        if (cancelled) return
        setDetails(null)
        setError(err?.message ?? "Failed to fetch.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedAgencyId])

  if (!selectedAgencyId) {
    return (
      <div className="min-h-[120px] rounded border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm px-4 text-center">
        Select an agent in New Booking Details (choose Agent payment and select an agency) to view agent book and financial details here.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[120px] rounded border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <span className="ml-2">Loading…</span>
      </div>
    )
  }

  if (error || !details) {
    return (
      <div className="min-h-[120px] rounded border border-dashed border-border flex items-center justify-center text-destructive text-sm px-4">
        {error ?? "Failed to load agency"}
      </div>
    )
  }

  const agentLabel = details.code
    ? `${details.name} (${details.code})`
    : details.name

  // Same rule as agent booking: amount must be <= balance + allowedCreditLimit
  const usableBalance =
    Number(details.balance ?? 0) + Number(details.allowedCreditLimit ?? 0)

  return (
    <div className="space-y-3">
      {/* Agent and Booking Identifiers */}
      <div className="rounded-md border border-border/60 bg-muted/10 p-2 space-y-1.5">
        <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Agent &amp; Book
        </h3>
        {details.books.length === 0 ? (
          <div className="flex justify-between gap-3 py-1.5 text-[11px]">
            <span className="text-muted-foreground">No books</span>
            <span className="text-foreground font-medium">{agentLabel}</span>
          </div>
        ) : (
          <div className="space-y-0">
            {details.books.map((book) => (
              <div
                key={book.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5 border-b border-border/40 last:border-0 text-[11px]"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0">
                  <span className="text-muted-foreground">Book No.</span>
                  <span className="font-medium text-foreground">{book.bookNumber}</span>
                  <span className="text-muted-foreground">From</span>
                  <span className="text-foreground">{book.startNumber}</span>
                  <span className="text-muted-foreground">To</span>
                  <span className="text-foreground">{book.endNumber}</span>
                </div>
                <span className="text-foreground font-medium">{agentLabel}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Financial details: balance from linked PAYABLE account; soft limit = Allowed Credit Limit; hard cap = account maxBalanceAllowed */}
      <div className="rounded-md border border-border/60 bg-green-50/80 dark:bg-green-950/20 p-2 space-y-1.5">
        <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Financial
        </h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <div className="flex justify-between gap-2 py-1">
            <span className="text-muted-foreground">Allowed Credit Limit</span>
            <span className="text-foreground font-medium tabular-nums">
              {formatLKR(details.allowedCreditLimit)}
            </span>
          </div>
          <div className="flex justify-between gap-2 py-1">
            <span className="text-muted-foreground">Balance</span>
            <span className="text-foreground font-medium tabular-nums">
              {formatLKR(details.balance)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 dark:border-red-900/50 dark:bg-red-950/40">
          <span className="text-[11px] font-medium text-red-700 dark:text-red-300">
            Usable Balance
          </span>
          <span className="text-sm font-semibold tabular-nums text-red-700 dark:text-red-300">
            {formatLKR(usableBalance)}
          </span>
        </div>
      </div>
    </div>
  )
}
