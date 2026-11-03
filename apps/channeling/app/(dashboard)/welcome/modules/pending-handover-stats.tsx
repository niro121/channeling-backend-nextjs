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
import { ArrowRight, ArrowLeftRight } from 'lucide-react'
import { getDashboardHandoverStatsAction } from '@/app/actions/dashboard/dashboard.actions'
import { useAsyncModule } from '@/app/(dashboard)/welcome/use-async-module'
import { QueueSnapshotSkeleton } from '@/app/(dashboard)/welcome/skeletons'

export function PendingHandoverStats({ href }: { href: string }) {
  const state = useAsyncModule(getDashboardHandoverStatsAction)

  if (state.status === 'loading') return <QueueSnapshotSkeleton />

  const stats =
    state.status === 'ok' ? state.data : { toAccept: null, sentByMe: null }

  const cells = [
    stats.toAccept != null ? { label: 'To accept', value: stats.toAccept } : null,
    stats.sentByMe != null ? { label: 'Sent by me', value: stats.sentByMe } : null,
  ].filter((cell): cell is { label: string; value: number } => cell != null)

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            Pending handovers
          </CardTitle>
          <CardDescription>Waiting for acceptance</CardDescription>
        </div>
        <Link href={href}>
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
          <div className={`grid gap-3 ${cells.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
