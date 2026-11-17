'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  FilePenLine,
  Lock,
  Moon,
  MoonStar,
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
    title: 'HR Admin setup',
    body: 'Maintain Manage Rosters (group codes, shifts/person/day), Holiday Calendar, and place masters (Department / Zone / Room). Staff Employment roster = Manage Roster code.',
    href: '/manage-rosters',
    linkLabel: 'Open Manage Rosters'
  },
  {
    n: 1,
    title: 'Shift Types',
    body: 'Define hospital shift templates (times, night / overnight / holiday-eligible flags). Codes are SHF-n. These feed Assignment, Duty, and calendar allocate.',
    href: '/shift-types',
    linkLabel: 'Open Shift Types'
  },
  {
    n: 2,
    title: 'Shift Assignment',
    body: 'Standing rules: staff ↔ shift type ↔ Manage Roster, rotation (Fixed v1 for Auto Assign), weekly off, Auto Assign toggle. Not a calendar cell.',
    href: '/shift-assignment',
    linkLabel: 'Open Shift Assignment'
  },
  {
    n: 3,
    title: 'Plan the week / month',
    body: 'On Shift Roster: Load filters, Allocate / drag drafts, Fill New or Create Fixed Roster (Fixed + Auto Assign), soft-warn Continue on leave / weekly off, then Publish.',
    href: '/shift-roster',
    linkLabel: 'Open Shift Roster'
  },
  {
    n: 4,
    title: 'Daily operations',
    body: 'Duty Roster is the same RosterAllocation store as a daily list — assign, swap, replace, attendance enum. Published dates locked except via Amendments.',
    href: '/duty-roster',
    linkLabel: 'Open Duty Roster'
  },
  {
    n: 5,
    title: 'Amend published cells',
    body: 'Roster Amendments overlay published duties. Approve writes the cell; Reject leaves the roster unchanged.',
    href: '/roster-amendments',
    linkLabel: 'Open Amendments'
  },
  {
    n: 6,
    title: 'Derived registers',
    body: 'Night, Overnight, and Public Holiday Shifts are views / add paths on the same allocations (flags, day-split, holiday dates). Payroll / lieu flags only in v1.',
    href: '/night-shifts',
    linkLabel: 'Open Night Shifts'
  }
];

const SETUP_NOTES = [
  {
    title: 'A. One allocation store',
    items: [
      'Shift Roster (week/month grid) and Duty Roster (daily list) share RosterAllocation — staff × date × shiftType.',
      'Do not persist Duty as a second copy of the week.',
      'Night / Overnight / PH query the same store (shift-type flags or holiday date).'
    ]
  },
  {
    title: 'B. Standing vs calendar',
    items: [
      'Shift Assignment = standing rule over a date range (feeds Fill / Auto Assign).',
      'Calendar cells are drafts until Publish; then immutable except via Amendments.',
      'Auto Assign v1 = Fixed pattern + autoAssign + active; empty days only.'
    ]
  },
  {
    title: 'C. Soft warns & uniqueness',
    items: [
      'Leave / weekly-off overlaps → soft warn + Continue (not hard block on allocate / fill / publish).',
      'Uniqueness: staff × date × shiftType + time-overlap hard block; day cap from Manage Rosters (INT-R4).',
      'Cell Leave checkbox is independent of Leave Application.'
    ]
  },
  {
    title: 'D. Owned elsewhere (not this group)',
    items: [
      'OT Process Staff Shift → published roster read (Overtime Manager).',
      'sendToPayroll / grantLieuLeave → Payroll / Leave (flags only in v1).',
      'Daily Attendance → Confirm to Duty Roster (Attendance — never auto from punches).'
    ]
  }
];

const MODULES: ModuleCard[] = [
  {
    href: '/shift-types',
    title: 'Shift Types',
    description:
      'Operational shift template master (SHF-n): times, duration, night / overnight / holiday-eligible flags.',
    step: 'Setup',
    icon: <Tags className="h-5 w-5" />,
    writeHint: 'add / edit / delete'
  },
  {
    href: '/shift-assignment',
    title: 'Shift Assignment',
    description:
      'Standing staff ↔ shift / rotation rules under a Manage Roster; Auto Assign All for Fixed patterns.',
    step: 'Setup',
    icon: <ClipboardList className="h-5 w-5" />,
    writeHint: 'add / edit / delete'
  },
  {
    href: '/shift-roster',
    title: 'Shift Roster',
    description:
      'Week/month planning grid: allocate, fill, copy, publish, drag drafts, export, Create Fixed Roster.',
    step: 'Plan',
    icon: <CalendarRange className="h-5 w-5" />,
    writeHint: 'add / edit / delete'
  },
  {
    href: '/duty-roster',
    title: 'Duty Roster',
    description:
      'Daily view of the same cells: standing/ad-hoc assign, place FKs, swap / replace, attendance enum.',
    step: 'Operate',
    icon: <ClipboardCheck className="h-5 w-5" />,
    writeHint: 'add / edit / delete'
  },
  {
    href: '/roster-amendments',
    title: 'Roster Amendments',
    description:
      'Change published duties via draft → approve / reject; Approve applies to the allocation cell.',
    step: 'Change',
    icon: <FilePenLine className="h-5 w-5" />,
    writeHint: 'add / edit / delete'
  },
  {
    href: '/night-shifts',
    title: 'Night Shifts',
    description:
      'Register of night-flagged allocations; consecutive-nights badge; sendToPayroll flag only.',
    step: 'Derived',
    icon: <Moon className="h-5 w-5" />,
    writeHint: 'add / edit / delete'
  },
  {
    href: '/overnight-shifts',
    title: 'Overnight Shifts',
    description:
      'Overnight-flagged allocations with stored day-split hours and Recalculate Splits.',
    step: 'Derived',
    icon: <MoonStar className="h-5 w-5" />,
    writeHint: 'add / edit / delete'
  },
  {
    href: '/public-holiday-shifts',
    title: 'Public Holiday Shifts',
    description:
      'Duties on Holiday Calendar dates; pay rate / lieu / payroll flags; bulk assign.',
    step: 'Derived',
    icon: <PartyPopper className="h-5 w-5" />,
    writeHint: 'add / edit / delete'
  }
];

const PERMISSION_ACTIONS = [
  {
    action: 'view',
    meaning: 'Open Guide and all Roster & Shifts screens; export where available'
  },
  {
    action: 'add',
    meaning:
      'Create shift types, assignments, allocate / fill / publish, add Night / Overnight / PH, create amendments'
  },
  {
    action: 'edit',
    meaning:
      'Update drafts, drag reassign, soft-warn Continue, swap / replace, approve amendments, recalculate splits'
  },
  {
    action: 'delete',
    meaning:
      'Delete shift types (when unused), assignments, draft allocations, draft amendments'
  }
] as const;

export default function RosterShiftsGuideWorkspace() {
  const { has, canAccess } = usePermissions();
  const canViewGuide =
    has('shift-roster', 'view') || canAccess('/roster-shifts');

  return (
    <div className="space-y-8">
      <CommonManagerHeader
        title="Roster & Shifts Guide"
        description="Module order, responsibilities, and the end-to-end process from shift templates to published duties."
      />

      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" />
            Permissions
          </CardTitle>
          <CardDescription>
            This Guide and every Roster & Shifts screen use the single Auth
            resource <strong>Roster & Shifts</strong> (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              shift-roster
            </code>
            ). Grant it on the user’s User Group, then re-login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PERMISSION_ACTIONS.map((row) => {
              const granted = has('shift-roster', row.action);
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
            Manage Rosters, Holiday Calendar, and place masters use their own
            HR Admin resources — grant those separately if operators maintain
            setup data.
          </p>
          {!canViewGuide ? (
            <p className="text-sm text-amber-800 dark:text-amber-300">
              You do not have <strong>view</strong> on Roster & Shifts. Ask an
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
            Define templates and standing rules → plan the calendar → operate
            daily duties → amend published cells → use derived Night / Overnight
            / PH registers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Types · Assignment
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Shift Roster
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Duty Roster
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Amendments
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Night · Overnight · PH
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
            <h2 className="text-lg font-semibold">What to prepare</h2>
            <p className="text-sm text-muted-foreground">
              Roster & Shifts depends on HR Admin masters and a single
              allocation store — keep these rules in mind before planning a
              week.
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
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
          Recommended order: Setup → Plan → Operate → Change → Derived
          registers.
        </p>
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
                    Needs <span className="font-medium">{mod.writeHint}</span> on
                    Roster & Shifts
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
                One <strong>RosterAllocation</strong> store — Shift Roster and
                Duty are two views, not two databases.
              </li>
              <li>
                After <strong>Publish</strong>, cells change only via{' '}
                <strong>Roster Amendments</strong> (Approve).
              </li>
              <li>
                Pages must not call Prisma; mutations go through actions →
                services.
              </li>
              <li>
                Attendance Confirm to Duty and OT Process Staff Shift are owned
                by Attendance / Overtime — not auto-wired from punches or fake
                APIs.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
