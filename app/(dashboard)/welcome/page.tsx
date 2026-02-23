import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CalendarCheck,
  DollarSign,
  Stethoscope,
  UserPlus,
  ArrowRight,
  Clock,
  Users,
  CircleDot,
  PlayCircle,
} from "lucide-react"
import { getCurrentShiftAction } from "@/app/actions/shift.actions"
import { SHIFT_STATUS } from "@/types/shift"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Sample data for dashboard (no API – placeholder only)
const SAMPLE = {
  todayBookings: 42,
  todayRevenue: 284750,
  sessionsToday: 12,
  newPatientsThisMonth: 38,
  recentBookings: [
    { time: "8:30 AM", name: "MRS. SURANGANI MALKANTHI", consultant: "PROF. CHANDIMA JEEWANDARA", fee: "6,190" },
    { time: "9:00 AM", name: "MR. KUMARA PERERA", consultant: "DR. NIMAL FERNANDO", fee: "3,500" },
    { time: "9:15 AM", name: "MRS. ANOMA JAYASINGHE", consultant: "PROF. CHANDIMA JEEWANDARA", fee: "6,190" },
    { time: "10:00 AM", name: "MR. SUNIL GUNASEKERA", consultant: "DR. NIMAL FERNANDO", fee: "3,500" },
  ],
  quickLinks: [
    { href: "/channel-booking", label: "Channel Booking", icon: CalendarCheck, description: "New appointment" },
    { href: "/doctors", label: "Doctors", icon: Stethoscope, description: "Manage consultants" },
    { href: "/patients", label: "Patients", icon: Users, description: "Patient records" },
    { href: "/doctor-sessions", label: "Doctor Sessions", icon: Clock, description: "Session schedule" },
  ],
}

function formatShiftStarted(startedAt: Date | string): string {
  const start = typeof startedAt === "string" ? new Date(startedAt) : startedAt
  const now = new Date()
  const ms = now.getTime() - start.getTime()
  const minutes = Math.floor(ms / (1000 * 60))
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))

  if (minutes < 1) return "Started just now"
  if (minutes < 60) return `Started ${minutes}m ago`
  if (hours < 24) return `Started ${hours}h ago`
  if (days < 7) return `Started ${days}d ago`
  return `Started at ${start.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
}

export default async function WelcomePage() {
  let currentShift: Awaited<ReturnType<typeof getCurrentShiftAction>> = null
  try {
    currentShift = await getCurrentShiftAction()
  } catch {
    // No shift permission or not logged in – don't show shift section
  }

  let twoFactorEnabled: Boolean = false;

  try {
    const res = await fetch(
      '/api/auth/2fa-status',
      { cache: 'no-store' }
    );

    if (res.ok) {
      const data = await res.json();
      twoFactorEnabled = !!data?.hasAuthenticator;
    }
  } catch {
    twoFactorEnabled = false;
  }
  const isActive = currentShift?.status === SHIFT_STATUS.ACTIVE
  const isPaused = currentShift?.status === SHIFT_STATUS.PAUSED
  const showShift = currentShift && (isActive || isPaused)

  return (
    <main className="space-y-6 pb-8">
      {
        !twoFactorEnabled && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 p-4">
            <p className="font-medium text-red-600 dark:text-red-400">Two Factor Authentication (2FA) is not activated.</p>
          </div>
        )
      }
      {/* Page Header */}
      <section>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          Welcome to Ruhunu
        </h1>
        <p className="text-muted-foreground mt-1">
          Patient channelling dashboard – overview and quick actions.
        </p>
      </section>

      {/* Active or paused shift */}
      {showShift && (
        <section>
          <Card
            className={`border ${isActive ? "border-primary/30 bg-primary/5" : "border-amber-500/30 bg-amber-500/5"}`}
          >
            <CardHeader className="py-4 px-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isActive ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}`}
                  >
                    {isActive ? (
                      <CircleDot className="h-5 w-5" />
                    ) : (
                      <PlayCircle className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="text-base font-semibold">
                      {isActive ? "Active shift" : "Paused shift"}
                    </CardTitle>
                    <CardDescription className="mt-0.5 text-sm">
                      {formatShiftStarted(currentShift.startedAt)}
                    </CardDescription>
                  </div>
                </div>
                <Link href="/channel-booking" className="shrink-0">
                  <Button size="sm" className="gap-2 w-full sm:w-auto">
                    Open Channel Booking
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
          </Card>
        </section>
      )}

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Bookings
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">{SAMPLE.todayBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">Appointments booked for today</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">
              Rs. {SAMPLE.todayRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Collected from channelling</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sessions Today
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">{SAMPLE.sessionsToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Consultant sessions running</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New Patients
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">{SAMPLE.newPatientsThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick actions */}
        <Card className="lg:col-span-1 border-border">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
            <CardDescription>Shortcuts for channelling tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {SAMPLE.quickLinks.map((item) => {
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

        {/* Recent bookings (sample list) */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent bookings (sample)</CardTitle>
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
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left font-medium py-3 px-4">Time</th>
                    <th className="text-left font-medium py-3 px-4">Patient</th>
                    <th className="text-left font-medium py-3 px-4">Consultant</th>
                    <th className="text-right font-medium py-3 px-4">Fee (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE.recentBookings.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-4 text-muted-foreground">{row.time}</td>
                      <td className="py-3 px-4 font-medium">{row.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{row.consultant}</td>
                      <td className="py-3 px-4 text-right">{row.fee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground">
        This is a sample dashboard. Numbers and recent bookings are placeholders. Connect your data to show live metrics.
      </p>
    </main>
  )
}
