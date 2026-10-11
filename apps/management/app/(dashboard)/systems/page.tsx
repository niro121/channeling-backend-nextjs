import { authPrisma } from '@archmage/db-auth';
import { CheckCircle2, CircleDashed, KeyRound, Stethoscope, TriangleAlert, Wallet, Fingerprint } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@archmage/ui';
import { getChannelingOverview, isChannelingApiConfigured } from '@/lib/sources/channeling';
import { cn } from '@/lib/utils';
import { getAuthStats } from '@/lib/sources/auth-stats';
import { UsersByAppChart } from './users-by-app-chart';
import { getManagementAccess } from '@/lib/management-access';

export const dynamic = 'force-dynamic';

type Status = 'connected' | 'error' | 'not-configured' | 'planned';

const STATUS_LABEL: Record<Status, string> = {
  connected: 'Connected',
  error: 'Unavailable',
  'not-configured': 'Not configured',
  planned: 'Not connected yet'
};

async function check(fn: () => Promise<unknown>): Promise<Status> {
  try {
    await fn();
    return 'connected';
  } catch {
    return 'error';
  }
}

/** Which systems feed the dashboard, and whether each one is reachable right now. */
export default async function SystemsPage() {
  if ((await getManagementAccess()) !== 'allowed') return null;

  const [authStatus, channelingStatus, auth] = await Promise.all([
    check(() => authPrisma.user.count({ take: 1 })),
    isChannelingApiConfigured() ? check(getChannelingOverview) : Promise.resolve<Status>('not-configured'),
    getAuthStats().catch((error) => {
      console.error('[management systems] auth stats', error);
      return null;
    })
  ]);
  const twoFactorPct =
    auth && auth.activeUsers > 0 ? Math.round((auth.twoFactorEnabled / auth.activeUsers) * 100) : null;

  const systems: { name: string; feeds: string; icon: React.ReactNode; status: Status }[] = [
    { name: 'Accounts', feeds: 'Sign-in, users and 2FA adoption', icon: <KeyRound className="h-5 w-5" />, status: authStatus },
    { name: 'Channeling', feeds: 'Channel insights and approvals', icon: <Stethoscope className="h-5 w-5" />, status: channelingStatus },
    { name: 'HRM', feeds: 'Attendance, leave and overtime', icon: <Fingerprint className="h-5 w-5" />, status: 'planned' },
    { name: 'DPAY', feeds: 'Doctor payments and patient bills', icon: <Wallet className="h-5 w-5" />, status: 'planned' }
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <p className="text-sm text-muted-foreground">The systems Management reads from.</p>
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {systems.map((system) => (
          <li key={system.name} className="flex items-center gap-3 px-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {system.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{system.name}</p>
              <p className="truncate text-sm text-muted-foreground">{system.feeds}</p>
            </div>
            <span
              className={cn(
                'flex shrink-0 items-center gap-1.5 text-xs font-medium',
                system.status === 'connected' && 'text-primary',
                system.status === 'error' && 'text-destructive',
                (system.status === 'not-configured' || system.status === 'planned') && 'text-muted-foreground'
              )}
            >
              {system.status === 'connected' ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              ) : system.status === 'error' ? (
                <TriangleAlert className="h-4 w-4" aria-hidden />
              ) : (
                <CircleDashed className="h-4 w-4" aria-hidden />
              )}
              <span className="hidden sm:inline">{STATUS_LABEL[system.status]}</span>
              <span className="sr-only sm:hidden">{STATUS_LABEL[system.status]}</span>
            </span>
          </li>
        ))}
      </ul>

      {auth && (
        <Card className="mt-3 min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Users</CardTitle>
            <CardDescription>
              {auth.activeUsers.toLocaleString()} active · {auth.admins} admins · 2FA{' '}
              {twoFactorPct != null ? `${twoFactorPct}%` : '—'} ({auth.twoFactorEnabled} of {auth.activeUsers})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsersByAppChart data={auth.usersByApp} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
