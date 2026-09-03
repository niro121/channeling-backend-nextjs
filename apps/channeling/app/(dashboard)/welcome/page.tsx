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
import { TwoFABanner } from '@/app/(dashboard)/welcome/two-fa-banner'
import { ShiftStatusModule } from '@/app/(dashboard)/welcome/modules/shift-status'
import { TodayBookingsKpi } from '@/app/(dashboard)/welcome/modules/today-bookings-kpi'
import { TodayRevenueKpi } from '@/app/(dashboard)/welcome/modules/today-revenue-kpi'
import { SessionsTodayKpi } from '@/app/(dashboard)/welcome/modules/sessions-today-kpi'
import { NewPatientsKpi } from '@/app/(dashboard)/welcome/modules/new-patients-kpi'
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

/**
 * Sync shell: header + quick actions render immediately.
 * Each data module is a client component that fetches on mount independently.
 */
export default function WelcomePage() {
  return (
    <main className="space-y-6 pb-8">
      <TwoFABanner />
      <section>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          Welcome to Ruhunu
        </h1>
        <p className="text-muted-foreground mt-1">
          Patient channelling dashboard – overview and quick actions.
        </p>
      </section>

      <ShiftStatusModule />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TodayBookingsKpi />
        <TodayRevenueKpi />
        <SessionsTodayKpi />
        <NewPatientsKpi />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Quick actions</CardTitle>
              <CardDescription>Shortcuts for channelling tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {QUICK_LINKS.map((item) => {
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

          <QueueSnapshotModule />
        </div>

        <div className="lg:col-span-2 min-w-0">
          <RecentBookingsModule />
        </div>
      </div>
    </main>
  )
}
