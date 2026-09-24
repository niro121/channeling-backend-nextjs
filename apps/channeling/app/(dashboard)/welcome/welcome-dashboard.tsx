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
import {
  CalendarCheck,
  Stethoscope,
  ArrowRight,
  Clock,
  Users,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { usePermissions } from '@/components/hooks/use-permissions'
import { DASHBOARD_MODULES, DASHBOARD_RESOURCE } from '@/lib/dashboard-permissions'
import { TwoFABanner } from '@/app/(dashboard)/welcome/two-fa-banner'
import { ShiftStatusModule } from '@/app/(dashboard)/welcome/modules/shift-status'
import { TodayBookingsKpi } from '@/app/(dashboard)/welcome/modules/today-bookings-kpi'
import { TodayRevenueKpi } from '@/app/(dashboard)/welcome/modules/today-revenue-kpi'
import { SessionsTodayKpi } from '@/app/(dashboard)/welcome/modules/sessions-today-kpi'
import { ApprovalCenterStats } from '@/app/(dashboard)/welcome/modules/approval-center-stats'
import { FloatRequestStats } from '@/app/(dashboard)/welcome/modules/float-request-stats'
import { RecentBookingsModule } from '@/app/(dashboard)/welcome/modules/recent-bookings'
import { QueueSnapshotModule } from '@/app/(dashboard)/welcome/modules/queue-snapshot'

const QUICK_LINKS = [
  {
    href: '/channel-booking',
    label: 'Channel Booking',
    icon: CalendarCheck,
    description: 'New appointment',
  },
  {
    href: '/doctors',
    label: 'Doctors',
    icon: Stethoscope,
    description: 'Manage consultants',
  },
  {
    href: '/patients',
    label: 'Patients',
    icon: Users,
    description: 'Patient records',
  },
  {
    href: '/doctor-sessions',
    label: 'Doctor Sessions',
    icon: Clock,
    description: 'Session schedule',
  },
] as const

function QuickActions({ links }: { links: typeof QUICK_LINKS[number][] }) {
  if (links.length === 0) return null

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base">Quick actions</CardTitle>
        <CardDescription>Shortcuts for areas you can open</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {links.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className="w-full justify-between h-auto py-3 px-3 text-foreground hover:bg-primary/10 hover:text-primary"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-left">
                    <span className="block font-medium">{item.label}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}

export function WelcomeDashboard() {
  const { status } = useSession()
  const { has, canAccess } = usePermissions()
  if (status === 'loading') {
    return (
      <main className="space-y-6 pb-8">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
      </main>
    )
  }

  const can = (action: string) => has(DASHBOARD_RESOURCE, action)

  const showShift = can(DASHBOARD_MODULES.shiftStatus)
  const showBookings = can(DASHBOARD_MODULES.todayBookings)
  const showRevenue = can(DASHBOARD_MODULES.todayRevenue)
  const showSessions = can(DASHBOARD_MODULES.sessionsToday)
  const showRecent = can(DASHBOARD_MODULES.recentBookings)
  const showQueue = can(DASHBOARD_MODULES.queueSnapshot)
  const showApprovals = canAccess('/approvals')
  const showFloat = canAccess('/bulk-cashier') || canAccess('/float-transfers')
  const floatHref = canAccess('/bulk-cashier') ? '/bulk-cashier' : '/float-transfers'
  const hasLiveModules =
    showShift ||
    showBookings ||
    showRevenue ||
    showSessions ||
    showRecent ||
    showQueue ||
    showApprovals ||
    showFloat

  const links = QUICK_LINKS.filter((item) => canAccess(item.href))
  const kpiCount = [showBookings, showRevenue, showSessions].filter(Boolean).length

  return (
    <main className="space-y-6 pb-8">
      <TwoFABanner />
      <section>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          Welcome to Ruhunu
        </h1>
        <p className="text-muted-foreground mt-1">
          {hasLiveModules
            ? 'Patient channelling dashboard – overview and quick actions.'
            : 'Use the menu to open the areas available to your role.'}
        </p>
      </section>

      {!hasLiveModules ? (
        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">You are signed in</CardTitle>
              <CardDescription>
                Live figures stay hidden until a dashboard module is granted to your user group.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Channel bookings, sessions, and patient records are available from the sidebar when your role includes them.</p>
              <p>An administrator can turn on individual dashboard modules under User Groups → Dashboard.</p>
            </CardContent>
          </Card>
          <QuickActions links={links} />
        </section>
      ) : (
        <>
          {showShift ? <ShiftStatusModule /> : null}

          {kpiCount > 0 ? (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {showBookings ? <TodayBookingsKpi /> : null}
              {showRevenue ? <TodayRevenueKpi /> : null}
              {showSessions ? <SessionsTodayKpi /> : null}
            </section>
          ) : null}

          {showApprovals || showFloat ? (
            <section className="grid gap-4 lg:grid-cols-2">
              {showApprovals ? <ApprovalCenterStats /> : null}
              {showFloat ? <FloatRequestStats href={floatHref} /> : null}
            </section>
          ) : null}

          {showQueue || showRecent || links.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-3">
              {showQueue || links.length > 0 ? (
                <div className={`space-y-6 ${showRecent ? '' : 'lg:col-span-3'}`}>
                  <QuickActions links={links} />
                  {showQueue ? <QueueSnapshotModule /> : null}
                </div>
              ) : null}
              {showRecent ? (
                <div className={showQueue || links.length > 0 ? 'lg:col-span-2 min-w-0' : 'lg:col-span-3 min-w-0'}>
                  <RecentBookingsModule />
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </main>
  )
}
