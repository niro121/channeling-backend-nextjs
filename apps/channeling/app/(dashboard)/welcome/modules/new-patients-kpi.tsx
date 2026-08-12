'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { UserPlus } from 'lucide-react'
import { getDashboardNewPatientsAction } from '@/app/actions/dashboard/dashboard.actions'
import { useAsyncModule } from '@/app/(dashboard)/welcome/use-async-module'
import { KpiCardSkeleton } from '@/app/(dashboard)/welcome/skeletons'

export function NewPatientsKpi() {
  const state = useAsyncModule(getDashboardNewPatientsAction)

  if (state.status === 'loading') return <KpiCardSkeleton />

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          New Patients
        </CardTitle>
        <UserPlus className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {state.status === 'error' ? (
          <p className="text-sm text-muted-foreground">{state.message}</p>
        ) : (
          <>
            <div className="text-2xl font-semibold text-foreground">
              {state.data.value.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
