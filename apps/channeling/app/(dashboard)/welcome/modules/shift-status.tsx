'use client'

import Link from 'next/link'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, CircleDot, PlayCircle } from 'lucide-react'
import { getCurrentShiftAction } from '@/app/actions/shift.actions'
import { SHIFT_STATUS } from '@/types/shift'
import { useAsyncModule } from '@/app/(dashboard)/welcome/use-async-module'

function formatShiftStarted(startedAt: Date | string): string {
  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt
  const now = new Date()
  const ms = now.getTime() - start.getTime()
  const minutes = Math.floor(ms / (1000 * 60))
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'Started just now'
  if (minutes < 60) return `Started ${minutes}m ago`
  if (hours < 24) return `Started ${hours}h ago`
  if (days < 7) return `Started ${days}d ago`
  return `Started at ${start.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
}

function ShiftCardSkeleton() {
  return (
    <Card className="border border-border">
      <CardHeader className="py-4 px-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

async function loadCurrentShift() {
  try {
    return await getCurrentShiftAction()
  } catch {
    return null
  }
}

export function ShiftStatusModule() {
  const state = useAsyncModule(loadCurrentShift)

  if (state.status === 'loading') return <ShiftCardSkeleton />
  if (state.status === 'error' || !state.data) return null

  const currentShift = state.data
  const isActive = currentShift.status === SHIFT_STATUS.ACTIVE
  const isPaused = currentShift.status === SHIFT_STATUS.PAUSED
  if (!isActive && !isPaused) return null

  const endsAt =
    typeof currentShift.endsAt === 'string'
      ? new Date(currentShift.endsAt)
      : currentShift.endsAt
  const isExpired = endsAt instanceof Date && !Number.isNaN(endsAt.getTime()) && endsAt.getTime() <= Date.now()

  return (
    <section>
      <Card
        className={`border ${
          isExpired
            ? 'border-destructive/40 bg-destructive/5'
            : isActive
              ? 'border-primary/30 bg-primary/5'
              : 'border-amber-500/30 bg-amber-500/5'
        }`}
      >
        <CardHeader className="py-4 px-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isExpired
                    ? 'bg-destructive/15 text-destructive'
                    : isActive
                      ? 'bg-primary/15 text-primary'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}
              >
                {isActive && !isExpired ? (
                  <CircleDot className="h-5 w-5" />
                ) : (
                  <PlayCircle className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0">
                <CardTitle className="text-base font-semibold">
                  {isExpired
                    ? 'Shift expired — handover required'
                    : isActive
                      ? 'Active shift'
                      : 'Paused shift'}
                </CardTitle>
                <CardDescription className="mt-0.5 text-sm">
                  {isExpired
                    ? 'Complete handover before starting a new shift.'
                    : formatShiftStarted(currentShift.startedAt)}
                </CardDescription>
              </div>
            </div>
            <Link href="/channel-booking" className="shrink-0">
              <Button size="sm" className="gap-2 w-full sm:w-auto" variant={isExpired ? 'destructive' : 'default'}>
                {isExpired ? 'Complete handover' : 'Open Channel Booking'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
      </Card>
    </section>
  )
}
