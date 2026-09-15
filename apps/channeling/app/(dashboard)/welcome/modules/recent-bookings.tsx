'use client'

import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { getDashboardRecentBookingsAction } from '@/app/actions/dashboard/dashboard.actions'
import { useAsyncModule } from '@/app/(dashboard)/welcome/use-async-module'
import { RecentBookingsSkeleton } from '@/app/(dashboard)/welcome/skeletons'

export function RecentBookingsModule() {
  const state = useAsyncModule(getDashboardRecentBookingsAction)

  if (state.status === 'loading') return <RecentBookingsSkeleton />

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Recent bookings</CardTitle>
          <CardDescription>Today&apos;s appointments</CardDescription>
        </div>
        <Link href="/channel-booking">
          <Button variant="outline" size="sm" className="gap-1">
            Channel Booking
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {state.status === 'error' ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {state.message}
          </p>
        ) : state.data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No bookings for today yet.
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left font-medium py-3 px-4">Time</th>
                  <th className="text-left font-medium py-3 px-4">Patient</th>
                  <th className="text-left font-medium py-3 px-4">
                    Consultant
                  </th>
                  <th className="text-right font-medium py-3 px-4">
                    Fee (Rs.)
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="py-3 px-4 text-muted-foreground">
                      {row.time}
                    </td>
                    <td className="py-3 px-4 font-medium">{row.patientName}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {row.consultantName}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {Math.round(row.fee).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
