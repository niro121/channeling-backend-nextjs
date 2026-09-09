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
import { getDashboardQueueSnapshotAction } from '@/app/actions/dashboard/dashboard.actions'
import { useAsyncModule } from '@/app/(dashboard)/welcome/use-async-module'
import { QueueSnapshotSkeleton } from '@/app/(dashboard)/welcome/skeletons'

export function QueueSnapshotModule() {
  const state = useAsyncModule(getDashboardQueueSnapshotAction)

  if (state.status === 'loading') return <QueueSnapshotSkeleton />

  const snapshot =
    state.status === 'ok'
      ? state.data
      : { activeRooms: 0, waiting: 0, shown: 0, noShow: 0 }

  const cells = [
    { label: 'Active rooms', value: snapshot.activeRooms },
    { label: 'Waiting', value: snapshot.waiting },
    { label: 'Shown', value: snapshot.shown },
    { label: 'No-show', value: snapshot.noShow },
  ]

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">Queue snapshot</CardTitle>
          <CardDescription>Live channel room status</CardDescription>
        </div>
        <Link href="/channel-room-dashboard">
          <Button variant="outline" size="sm" className="gap-1 shrink-0">
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {state.status === 'error' ? (
          <p className="text-sm text-muted-foreground">{state.message}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {cells.map((cell) => (
              <div
                key={cell.label}
                className="rounded-md border border-border bg-muted/30 px-3 py-2"
              >
                <p className="text-xs text-muted-foreground">{cell.label}</p>
                <p className="text-lg font-semibold tabular-nums">
                  {cell.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
