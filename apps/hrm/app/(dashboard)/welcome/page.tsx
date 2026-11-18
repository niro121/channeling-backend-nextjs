import { fetchServerSession } from '@/lib/session';
import { Users, CalendarClock, ClipboardCheck, DollarSign, TrendingUp, Clock } from 'lucide-react';

export default async function WelcomePage() {
  const session = await fetchServerSession();
  const userName = session?.user?.name ?? 'there';

  const stats = [
    { label: 'Total Employees', value: '—', icon: Users, description: 'Active workforce' },
    { label: 'Pending Leave Requests', value: '—', icon: CalendarClock, description: 'Awaiting approval' },
    { label: 'Attendance Today', value: '—', icon: ClipboardCheck, description: 'Present today' },
    { label: 'Payroll This Month', value: '—', icon: DollarSign, description: 'Processed' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {userName}</h1>
        <p className="text-sm text-muted-foreground mt-1">Here&apos;s an overview of your HR operations.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {['Leave request submitted', 'New employee onboarded', 'Payroll processed'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-primary/60 shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2 italic">Connect your data to see live activity.</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Upcoming</h2>
          </div>
          <div className="space-y-3">
            {['Team performance review', 'Payroll cutoff date', 'HR compliance audit'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2 italic">Connect your calendar to see scheduled events.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
