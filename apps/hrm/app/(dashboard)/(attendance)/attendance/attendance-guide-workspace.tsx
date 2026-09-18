'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FilePenLine,
  Fingerprint,
  KeyRound,
  Lock,
  Network,
  ScrollText,
  ShieldAlert,
  TabletSmartphone,
  Workflow
} from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { usePermissions } from '@/components/hooks/use-permissions';
import { cn } from '@/lib/utils';

type ModuleCard = {
  href: string;
  title: string;
  description: string;
  step: string;
  icon: ReactNode;
  writeHint?: string;
};

type ProcessStep = {
  n: number;
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
};

const PROCESS_STEPS: ProcessStep[] = [
  {
    n: 0,
    title: 'Setup',
    body: 'Register readers in Devices, enroll each staff Finger Print / RFID, set ATTENDANCE_DEVICE_API_KEY, point the gateway at HRM.',
    href: '/attendance-devices',
    linkLabel: 'Open Devices'
  },
  {
    n: 1,
    title: 'Punch',
    body: 'Staff tap a reader. The gateway POSTs to /api/attendance/punches. HRM stores an immutable punch and recomputes the day.'
  },
  {
    n: 2,
    title: 'Live watch',
    body: 'Use RFID Attendance to see today’s check-ins and present / late / missing / absent.',
    href: '/rfid-attendance',
    linkLabel: 'Open RFID Attendance'
  },
  {
    n: 3,
    title: 'Verify',
    body: 'Fingerprint Verification reconciles roster × date. Fill or edit Verified start/end, then Save. Raw punches stay unchanged.',
    href: '/fingerprint-verification',
    linkLabel: 'Open Verification'
  },
  {
    n: 4,
    title: 'Daily register',
    body: 'Daily Attendance is the operational list for a civil date. Refresh recomputes from punches and roster.',
    href: '/attendance-daily',
    linkLabel: 'Open Daily Attendance'
  },
  {
    n: 5,
    title: 'Correct',
    body: 'Corrections are the formal draft → approve / reject path when a day’s status or times need an audited change.',
    href: '/attendance-corrections',
    linkLabel: 'Open Corrections'
  },
  {
    n: 6,
    title: 'Confirm to roster',
    body: 'Coming next (P5): an explicit HR action copies the final day status onto the duty roster cell. Never automatic from punches.'
  }
];

const INSTALL_STEPS = [
  {
    title: 'A. Commission the reader',
    items: [
      'Mount and power the panel; connect LAN.',
      'Note or assign a stable device code (e.g. GATE-01).',
      'Install vendor middleware / ADMS / SDK on a LAN PC (the gateway).',
      'Confirm the gateway sees the reader (test tap).'
    ]
  },
  {
    title: 'B. Register in HRM Devices',
    items: [
      'Add Device with the same code the gateway will send as deviceCode.',
      'Set name, location, and status Active.',
      'Optional per-device API key is stored hashed (ingest today uses the global env key).'
    ]
  },
  {
    title: 'C. Connect gateway → HRM',
    items: [
      'URL: {HRM_BASE_URL}/api/attendance/punches',
      'Auth: X-Attendance-Api-Key or Bearer with ATTENDANCE_DEVICE_API_KEY',
      'Body: deviceCode, externalPunchId, rfid, punchedAt, optional direction',
      'Gateway handles retries; HRM ignores duplicate externalPunchId per device'
    ]
  },
  {
    title: 'D. Enroll staff',
    items: [
      'Staff → General → Finger Print / RFID = exact ID the machine sends.',
      'Must be unique among active staff.',
      'Scan-from-reader capture is planned after desk reader + gateway are live.'
    ]
  },
  {
    title: 'E. Acceptance test',
    items: [
      'Known staff tap → Devices Last Seen updates; RFID Attendance shows matched row.',
      'Same externalPunchId again → duplicate: true.',
      'Unknown RFID → unmatched punch stored for ops.'
    ]
  }
];

const MODULES: ModuleCard[] = [
  {
    href: '/attendance-devices',
    title: 'Devices',
    description:
      'Reader registry: code, location, active/inactive, last seen. Required so every punch has a known source.',
    step: 'Setup',
    icon: <TabletSmartphone className="h-5 w-5" />,
    writeHint: 'add / edit / delete'
  },
  {
    href: '/rfid-attendance',
    title: 'RFID Attendance',
    description:
      'Live dashboard for today’s check-ins and summary cards (present, late, missing, absent).',
    step: 'Watch',
    icon: <Fingerprint className="h-5 w-5" />
  },
  {
    href: '/fingerprint-verification',
    title: 'Fingerprint Verification',
    description:
      'Day-grouped reconcile against the roster. Fill verified times and Save without changing punches.',
    step: 'Verify',
    icon: <CheckCircle2 className="h-5 w-5" />,
    writeHint: 'edit to Save'
  },
  {
    href: '/attendance-daily',
    title: 'Daily Attendance',
    description:
      'Operational register for a date with filters, export, and Refresh recompute.',
    step: 'Register',
    icon: <ClipboardList className="h-5 w-5" />,
    writeHint: 'edit to Refresh'
  },
  {
    href: '/attendance-corrections',
    title: 'Corrections',
    description:
      'Audited create / approve / reject when HR must change a day’s status or times.',
    step: 'Correct',
    icon: <FilePenLine className="h-5 w-5" />,
    writeHint: 'add / edit / delete'
  },
  {
    href: '/attendance-summary',
    title: 'Summary',
    description:
      'Period overview by staff: present / absent / leave / OT totals with day-level detail sheet.',
    step: 'Report',
    icon: <BarChart3 className="h-5 w-5" />
  },
  {
    href: '/attendance-logs',
    title: 'Logs',
    description:
      'Read-only audit history of attendance events, corrections, and system actions.',
    step: 'Audit',
    icon: <ScrollText className="h-5 w-5" />
  }
];

const PERMISSION_ACTIONS = [
  {
    action: 'view',
    meaning:
      'Open Guide and all Staff Attendance screens; export where available'
  },
  {
    action: 'add',
    meaning: 'Create devices and corrections'
  },
  {
    action: 'edit',
    meaning:
      'Update devices, save verification, refresh daily, approve/reject corrections'
  },
  {
    action: 'delete',
    meaning: 'Delete devices (no punches) and draft corrections'
  }
] as const;

export default function AttendanceGuideWorkspace() {
  const { has, canAccess } = usePermissions();
  const canViewGuide = has('attendance', 'view') || canAccess('/attendance');

  return (
    <div className="space-y-8">
      <CommonManagerHeader
        title="Staff Attendance Guide"
        description="How readers connect to HRM, and the day-to-day procedure from punch to roster confirm."
      />

      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" />
            Permissions
          </CardTitle>
          <CardDescription>
            This Guide and every Staff Attendance screen use the single Auth
            resource <strong>Staff Attendance</strong> (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              attendance
            </code>
            ). Grant it on the user’s User Group, then re-login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PERMISSION_ACTIONS.map((row) => {
              const granted = has('attendance', row.action);
              return (
                <Badge
                  key={row.action}
                  variant="secondary"
                  className={cn(
                    'rounded-full border-0 font-medium capitalize',
                    granted
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                      : 'bg-muted text-muted-foreground hover:bg-muted'
                  )}
                >
                  {row.action}
                  {granted ? ' · granted' : ' · not granted'}
                </Badge>
              );
            })}
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {PERMISSION_ACTIONS.map((row) => (
              <li key={row.action} className="flex gap-2">
                <span className="w-14 shrink-0 font-medium capitalize text-foreground">
                  {row.action}
                </span>
                <span>{row.meaning}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Device punch ingest uses{' '}
            <code className="rounded bg-muted px-1 py-0.5">
              ATTENDANCE_DEVICE_API_KEY
            </code>
            , not User Group permissions.
          </p>
          {!canViewGuide ? (
            <p className="text-sm text-amber-800 dark:text-amber-300">
              You do not have <strong>view</strong> on Staff Attendance. Ask an
              admin to grant it on your User Group.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Workflow className="h-5 w-5 text-primary" />
            The simple story
          </CardTitle>
          <CardDescription>
            Staff tap a reader → HRM records who and when → HR reviews and fixes
            the day → later HR confirms onto the duty roster.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Reader
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Gateway
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              HRM ingest
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Live · Verify · Daily · Corrections
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Confirm (P5)
            </span>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">End-to-end procedure</h2>
        <ol className="grid gap-3 lg:grid-cols-2">
          {PROCESS_STEPS.map((step) => {
            const linkOk = Boolean(step.href && canAccess(step.href));
            return (
              <li key={step.n}>
                <Card className="h-full rounded-lg border border-border shadow-sm">
                  <CardContent className="flex gap-3 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold tabular-nums text-primary">
                      {step.n}
                    </span>
                    <div className="min-w-0 space-y-1.5">
                      <p className="font-semibold">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.body}</p>
                      {linkOk && step.href ? (
                        <Link
                          href={step.href}
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          {step.linkLabel}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="space-y-3">
        <div className="flex items-start gap-2">
          <Network className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">
              Device installation & connection to HRM
            </h2>
            <p className="text-sm text-muted-foreground">
              Readers never call the browser. A LAN gateway posts punches to the
              HRM API using a shared key.
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {INSTALL_STEPS.map((block) => (
            <Card
              key={block.title}
              className="rounded-lg border border-border shadow-sm"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{block.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {block.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-lg border border-border bg-muted/30 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-foreground">Ingest connection</p>
              <p className="font-mono text-xs text-muted-foreground">
                POST {'{'}HRM_BASE_URL{'}'}/api/attendance/punches
              </p>
              <p className="text-muted-foreground">
                Header{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  X-Attendance-Api-Key
                </code>{' '}
                = value of{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  ATTENDANCE_DEVICE_API_KEY
                </code>{' '}
                on the HRM server. Local smoke without hardware:{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  npm run smoke:attendance
                </code>{' '}
                (device code <span className="font-medium">DEV-LOCAL</span>).
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Module group</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((mod) => {
            const allowed = canAccess(mod.href);
            const card = (
              <div
                className={cn(
                  'group block rounded-lg border border-border bg-card p-4 shadow-sm transition-colors',
                  allowed
                    ? 'hover:border-primary/40 hover:bg-muted/20'
                    : 'opacity-60'
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {mod.icon}
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {mod.step}
                  </span>
                </div>
                <p
                  className={cn(
                    'font-semibold',
                    allowed && 'group-hover:text-primary'
                  )}
                >
                  {mod.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mod.description}
                </p>
                {mod.writeHint ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Needs <span className="font-medium">{mod.writeHint}</span>{' '}
                    on Staff Attendance
                  </p>
                ) : null}
                {allowed ? (
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                ) : (
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    No access
                  </span>
                )}
              </div>
            );

            return allowed ? (
              <Link key={mod.href} href={mod.href}>
                {card}
              </Link>
            ) : (
              <div key={mod.href}>{card}</div>
            );
          })}
        </div>
      </section>

      <Card className="rounded-lg border border-amber-200/80 bg-amber-50/50 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
        <CardContent className="flex gap-3 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-foreground">Hard rules</p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>
                Device punches are <strong>immutable</strong> — never edit or
                delete punch rows from HR screens.
              </li>
              <li>
                Verification and Corrections update the <strong>day</strong>{' '}
                (and audit), not the punch log.
              </li>
              <li>
                Duty Roster cells are <strong>not</strong> overwritten by
                punches — only Confirm to Duty Roster (P5).
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
