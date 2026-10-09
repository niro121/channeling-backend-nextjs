import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@archmage/ui';
import { Building2, CalendarCheck, Fingerprint, ShieldCheck, Stethoscope, Users, Wallet } from 'lucide-react';
import { getAuthStats } from '@/lib/sources/auth-stats';
import { getChannelingOverview, isChannelingApiConfigured } from '@/lib/sources/channeling';
import { InstallBanner } from '@/components/pwa/install-banner';
import { UsersByAppChart } from './users-by-app-chart';

export const dynamic = 'force-dynamic';

function StatCard({
  title,
  value,
  hint,
  icon
}: {
  title: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

const UPCOMING_SOURCES = [
  { title: 'Channeling revenue & bookings', icon: <CalendarCheck className="h-4 w-4" /> },
  { title: 'HRM attendance & leave', icon: <Fingerprint className="h-4 w-4" /> },
  { title: 'DPAY doctor payments', icon: <Wallet className="h-4 w-4" /> }
];

export default async function DashboardPage() {
  const channelingConfigured = isChannelingApiConfigured();
  const [authResult, channelingResult] = await Promise.allSettled([
    getAuthStats(),
    channelingConfigured ? getChannelingOverview() : Promise.reject(new Error('not configured'))
  ]);

  const auth = authResult.status === 'fulfilled' ? authResult.value : null;
  const channeling = channelingResult.status === 'fulfilled' ? channelingResult.value : null;
  if (authResult.status === 'rejected') console.error('[management dashboard] auth stats', authResult.reason);
  // A source being unreachable is expected (e.g. bad API credentials) — warn, the card shows it.
  if (channelingConfigured && channelingResult.status === 'rejected') {
    const reason = channelingResult.reason;
    console.warn('[management dashboard] channeling unavailable:', reason instanceof Error ? reason.message : reason);
  }

  const channelingHint = channelingConfigured ? 'Channeling unavailable' : 'Channeling not connected';
  const twoFactorPct =
    auth && auth.activeUsers > 0 ? Math.round((auth.twoFactorEnabled / auth.activeUsers) * 100) : null;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6">
      <InstallBanner />

      <div>
        {/* Phones show the title in the app header */}
        <h1 className="hidden text-xl font-semibold lg:block">Overview</h1>
        <p className="text-sm text-muted-foreground">
          As of {new Date().toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo' })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Active users"
          value={auth ? auth.activeUsers.toLocaleString() : '—'}
          hint={auth ? `${auth.admins} admins` : 'Auth DB unavailable'}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="2FA adoption"
          value={twoFactorPct != null ? `${twoFactorPct}%` : '—'}
          hint={auth ? `${auth.twoFactorEnabled} of ${auth.activeUsers} users` : undefined}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <StatCard
          title="Active doctors"
          value={channeling ? channeling.activeDoctors.toLocaleString() : '—'}
          hint={channeling ? 'Channeling' : channelingHint}
          icon={<Stethoscope className="h-4 w-4" />}
        />
        <StatCard
          title="Branches"
          value={channeling ? channeling.publishedBranches.toLocaleString() : '—'}
          hint={channeling ? 'Published in channeling' : channelingHint}
          icon={<Building2 className="h-4 w-4" />}
        />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Users by system</CardTitle>
            <CardDescription>Active users in each app&apos;s user groups</CardDescription>
          </CardHeader>
          <CardContent>
            {auth ? (
              <UsersByAppChart data={auth.usersByApp} />
            ) : (
              <p className="text-sm text-muted-foreground">Auth DB unavailable.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coming next</CardTitle>
            <CardDescription>Statistics that need stats APIs on each system</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {UPCOMING_SOURCES.map((source) => (
              <div key={source.title} className="flex items-center gap-3 rounded-md border border-dashed px-3 py-2.5">
                <span className="text-muted-foreground">{source.icon}</span>
                <span className="flex-1 text-sm">{source.title}</span>
                <span className="text-xs text-muted-foreground">Not connected</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
