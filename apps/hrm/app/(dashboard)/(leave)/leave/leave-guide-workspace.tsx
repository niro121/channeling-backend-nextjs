'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  FilePlus2,
  Lock,
  Network,
  PartyPopper,
  ShieldAlert,
  Tags,
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
  resource: string;
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
    title: 'Leave Types',
    body: 'Define categories (Annual, Casual, Sick, …). Use Add Lieu once for the single compensatory bank used by holiday Grant Lieu Leave.',
    href: '/leave-types',
    linkLabel: 'Open Leave Types'
  },
  {
    n: 1,
    title: 'Leave Entitlement',
    body: 'Give each staff a balance for a date range (entitled / used / remaining). Lieu grants can also create or top up the calendar-year Lieu entitlement automatically.',
    href: '/leave-entitlement',
    linkLabel: 'Open Entitlement'
  },
  {
    n: 2,
    title: 'Leave Application',
    body: 'Staff or HR files a request. Process Shift lists duties covered by the leave dates. Process Lieu Shift (Lieu type only) picks the holiday duty that earned the day off. Save as pending.',
    href: '/leave-application',
    linkLabel: 'Open Application'
  },
  {
    n: 3,
    title: 'Leave Management',
    body: 'Approve / reject / cancel. Approve deducts days from the matching entitlement. Cancel after approve restores used days.',
    href: '/leave-management',
    linkLabel: 'Open Management'
  }
];

const LIEU_STEPS: ProcessStep[] = [
  {
    n: 1,
    title: 'Add / publish the Lieu leave type',
    body: 'On Leave Types, use Add Lieu (only once). Keep it published. This is not Annual — Grant Lieu never adds days to Annual.',
    href: '/leave-types',
    linkLabel: 'Open Leave Types'
  },
  {
    n: 2,
    title: 'Earn the day (Roster)',
    body: 'On Public Holiday Shifts, assign the staff duty, turn Grant Lieu Leave on, set status Approved (or published / amended). That posts +1 day to the Lieu bank for the calendar year of the duty date (1 Jan–31 Dec, Asia/Colombo) — it does not create a leave application.',
    href: '/public-holiday-shifts',
    linkLabel: 'Open Public Holiday Shifts'
  },
  {
    n: 3,
    title: 'Spend the day (Leave)',
    body: 'On Leave Application choose the Lieu type, Process Lieu Shift, select that duty, Save, then Approve in Management. Approving consumes 1 day from the Lieu bank.',
    href: '/leave-application',
    linkLabel: 'Open Application'
  }
];

const SETUP_NOTES = [
  {
    title: 'A. Process Shift vs Process Lieu Shift',
    items: [
      'Process Shift = duties the staff will miss during the leave period (snapshot on the form).',
      'Process Lieu Shift = which already-worked holiday duty this leave is in return for.',
      'Lieu type requires a lieu source duty; other types must not carry lieuShiftId.'
    ]
  },
  {
    title: 'B. Grant Lieu ≠ pay',
    items: [
      'Grant Lieu Leave on PH = leave credit (+1 to Lieu bank), not salary.',
      'Send to Payroll is a separate flag (payroll posting — still owned by Payroll).',
      'Same duty cannot be linked to two pending/approved leave apps.'
    ]
  },
  {
    title: 'C. Which entitlement period gets the +1?',
    items: [
      'Period = calendar year of the public-holiday duty date (Asia/Colombo): 1 Jan–31 Dec.',
      'Example: duty on 15 Mar 2026 → Lieu entitlement 1 Jan 2026–31 Dec 2026.',
      'If that year row does not exist yet, Grant Lieu creates it, then credits +1. Not tied to Annual from–to dates.'
    ]
  },
  {
    title: 'D. Soft link to roster',
    items: [
      'Leave stores allocation id + label snapshot — no Prisma FK to RosterAllocation.',
      'Ledger LieuLeaveGrant prevents double grant per duty.',
      'Reverse unused grant when Grant Lieu is turned off / duty deleted; blocked if already used by an approved leave.'
    ]
  }
];

const MODULES: ModuleCard[] = [
  {
    href: '/leave-types',
    title: 'Leave Types',
    description:
      'Master categories and policies (paid, approval, half-day). Lieu is a separate Add Lieu path.',
    step: 'Setup',
    icon: <Tags className="h-5 w-5" />,
    resource: 'leave-types',
    writeHint: 'add / edit / delete'
  },
  {
    href: '/leave-entitlement',
    title: 'Leave Entitlement',
    description:
      'Per-staff balances by leave type and period (entitled / used / remaining).',
    step: 'Setup',
    icon: <CalendarDays className="h-5 w-5" />,
    resource: 'leave-entitlement',
    writeHint: 'add / edit / delete'
  },
  {
    href: '/leave-application',
    title: 'Leave Application',
    description:
      'Create and edit leave forms; Process Shift / Process Lieu Shift; pending register.',
    step: 'Request',
    icon: <FilePlus2 className="h-5 w-5" />,
    resource: 'leave-application',
    writeHint: 'add / edit / delete'
  },
  {
    href: '/leave-management',
    title: 'Leave Management',
    description:
      'Approve, reject, cancel; balance overview and operational leave tools.',
    step: 'Decide',
    icon: <CalendarClock className="h-5 w-5" />,
    resource: 'leave-management',
    writeHint: 'edit (approve / reject / cancel)'
  }
];

const LEAVE_RESOURCES = [
  'leave-types',
  'leave-entitlement',
  'leave-application',
  'leave-management'
] as const;

export default function LeaveGuideWorkspace() {
  const { has, canAccess } = usePermissions();
  const canViewGuide = LEAVE_RESOURCES.some((resource) => has(resource, 'view'));

  return (
    <div className="space-y-8">
      <CommonManagerHeader
        title="Leave Guide"
        description="Module order, responsibilities, and how ordinary leave and Lieu (compensatory) leave work with Roster."
      />

      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" />
            Permissions
          </CardTitle>
          <CardDescription>
            Leave uses <strong>four</strong> Auth resources (unlike Roster’s
            single resource). Grant what operators need on the User Group, then
            re-login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {LEAVE_RESOURCES.map((resource) => {
              const granted = has(resource, 'view');
              return (
                <Badge
                  key={resource}
                  variant="secondary"
                  className={cn(
                    'rounded-full border-0 font-medium',
                    granted
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                      : 'bg-muted text-muted-foreground hover:bg-muted'
                  )}
                >
                  {resource}
                  {granted ? ' · view' : ' · no view'}
                </Badge>
              );
            })}
          </div>
          {!canViewGuide ? (
            <p className="text-sm text-amber-800 dark:text-amber-300">
              You do not have <strong>view</strong> on any Leave resource. Ask
              an admin to grant access on your User Group.
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
            Define types and balances → apply for leave → approve. Lieu is a
            special path: earn a day on a holiday duty, spend it later as Lieu
            leave.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Types
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Entitlement
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Application
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Management
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
          <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Lieu leave (with Roster)</h2>
            <p className="text-sm text-muted-foreground">
              Compensatory day off for working a public holiday (or other
              grant-flagged duty). Credit goes only to the{' '}
              <strong>Lieu</strong> leave type — never to Annual.
            </p>
          </div>
        </div>
        <ol className="grid gap-3 lg:grid-cols-3">
          {LIEU_STEPS.map((step) => {
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
            <h2 className="text-lg font-semibold">What to remember</h2>
            <p className="text-sm text-muted-foreground">
              Keep these rules in mind so Leave and Roster stay aligned without
              merging databases.
            </p>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {SETUP_NOTES.map((block) => (
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
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Module group</h2>
        <p className="text-sm text-muted-foreground">
          Recommended order: Types → Entitlement → Application → Management.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                    Needs <span className="font-medium">{mod.writeHint}</span> on{' '}
                    {mod.resource}
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
                Grant Lieu on a PH duty <strong>credits the Lieu bank</strong>{' '}
                for the <strong>duty’s calendar year</strong> (1 Jan–31 Dec) —
                it does not create a Leave Application.
              </li>
              <li>
                Taking the day off requires a <strong>Lieu</strong> leave
                application (Process Lieu Shift → Approve).
              </li>
              <li>
                Only one published Leave Type may have{' '}
                dedicated <strong>Lieu</strong> leave type (Add Lieu).
              </li>
              <li>
                Roster soft-warns when allocating over pending/approved leave
                (INT-L2) — that is separate from Process Shift / Lieu.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
