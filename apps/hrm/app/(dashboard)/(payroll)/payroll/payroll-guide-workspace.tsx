'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  Banknote,
  CircleMinus,
  CirclePlus,
  Cog,
  FileText,
  History,
  Landmark,
  Layers,
  ListChecks,
  Lock,
  Percent,
  PlayCircle,
  ShieldAlert,
  Users,
  Wallet,
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
    body: 'Maintain Paysheet Components, HRM Variables (EPF / ETF / PAYE), and Salary Cycles under HR Administration before running payroll.',
    href: '/paysheet-components',
    linkLabel: 'Open Paysheet Components'
  },
  {
    n: 1,
    title: 'Structures & catalogs',
    body: 'Define salary structures, then keep Allowances and Deductions catalogs aligned with paysheet component types.',
    href: '/salary-structures',
    linkLabel: 'Open Salary Structures'
  },
  {
    n: 2,
    title: 'Assign components',
    body: 'Assign paysheet lines to staff (single or bulk). Add performance allowances and register loans / advances when needed.',
    href: '/assign-paysheet-component',
    linkLabel: 'Open Assign Paysheet'
  },
  {
    n: 3,
    title: 'Generate',
    body: 'Pick a salary cycle and date ranges, then Generate Salary to create a draft payroll run with staff lines.',
    href: '/salary-generation',
    linkLabel: 'Open Salary Generation'
  },
  {
    n: 4,
    title: 'Process',
    body: 'Recalculate statutory amounts (EPF / ETF / PAYE), review the breakdown, then Approve or Hold the run.',
    href: '/salary-processing',
    linkLabel: 'Open Salary Processing'
  },
  {
    n: 5,
    title: 'Payslips',
    body: 'View, print, download, email, or SMS payslips from processed run lines.',
    href: '/payslips',
    linkLabel: 'Open Payslips'
  },
  {
    n: 6,
    title: 'Bank file & history',
    body: 'Generate a bank transfer file when bank format is integrated; Mark Processed moves payment status to Paid. Salary History shows past runs.',
    href: '/bank-transfer-file',
    linkLabel: 'Open Bank Transfer File'
  }
];

const SETUP_NOTES = [
  {
    title: 'A. Masters that feed payroll',
    items: [
      'Paysheet Components — shared definitions for allowances / deductions (no second masters).',
      'HRM Variables — EPF employee/employer, ETF, PAYE bands used in processing.',
      'Salary Cycles — periods selected on Salary Generation.'
    ]
  },
  {
    title: 'B. Staff data that matters',
    items: [
      'Employment paysheet / structure assignment so generation can price basic and lines.',
      'Bank fields on staff payroll (bank, branch, account) for future bank-file export.',
      'Active vs resigned filters on generation fill modes.'
    ]
  },
  {
    title: 'C. Run lifecycle',
    items: [
      'Generate → draft / generated run with staff + preview lines.',
      'Process → statutory calc, Approve → processed, Hold → on_hold.',
      'Payslips read from processed lines; Paid comes after bank Mark Processed (when enabled).'
    ]
  },
  {
    title: 'D. On hold for now',
    items: [
      'Bank Transfer File dynamize waits on bank sample format and payer account (§18.1 in the payroll guide doc).',
      'Salary History prefers complete Paid status after bank Mark Processed.'
    ]
  }
];

const MODULES: ModuleCard[] = [
  {
    href: '/salary-structures',
    title: 'Salary Structures',
    description:
      'Templates for basic, earnings, deductions, and employer lines used when generating salary.',
    step: 'Setup',
    icon: <Layers className="h-5 w-5" />,
    writeHint: 'add / edit / delete'
  },
  {
    href: '/allowances',
    title: 'Allowances',
    description:
      'Thin payroll UI over paysheet components typed as fixed or percentage allowance.',
    step: 'Setup',
    icon: <CirclePlus className="h-5 w-5" />,
    writeHint: 'add / edit / delete'
  },
  {
    href: '/deductions',
    title: 'Deductions',
    description:
      'Thin payroll UI over fixed deduction, loan, and advance component definitions.',
    step: 'Setup',
    icon: <CircleMinus className="h-5 w-5" />,
    writeHint: 'add / edit / delete'
  },
  {
    href: '/assign-paysheet-component',
    title: 'Assign Paysheet Component',
    description:
      'Assign a component to one staff member with an effective date range.',
    step: 'Assign',
    icon: <ListChecks className="h-5 w-5" />,
    writeHint: 'add / edit / delete'
  },
  {
    href: '/bulk-assign-paysheet-component',
    title: 'Bulk Assign',
    description:
      'Assign one component to many staff at once, with overlap handling.',
    step: 'Assign',
    icon: <Users className="h-5 w-5" />,
    writeHint: 'add / edit'
  },
  {
    href: '/performance-allowance',
    title: 'Performance Allowance',
    description:
      'Period-based performance amounts (`PFA-n`) separate from standard paysheet assignments.',
    step: 'Assign',
    icon: <Percent className="h-5 w-5" />,
    writeHint: 'add / edit / delete'
  },
  {
    href: '/loans-advances',
    title: 'Loans & Advances',
    description:
      'Register loans / advances, installments, and balances that feed payroll deductions.',
    step: 'Assign',
    icon: <Banknote className="h-5 w-5" />,
    writeHint: 'add / edit / delete'
  },
  {
    href: '/salary-generation',
    title: 'Salary Generation',
    description:
      'Select cycle and dates, generate a draft payroll run, fill staff, save or clear.',
    step: 'Run',
    icon: <PlayCircle className="h-5 w-5" />,
    writeHint: 'add / edit'
  },
  {
    href: '/salary-processing',
    title: 'Salary Processing',
    description:
      'Statutory recalculation, breakdown review, Approve / Hold / Release for a run.',
    step: 'Run',
    icon: <Cog className="h-5 w-5" />,
    writeHint: 'edit'
  },
  {
    href: '/payslips',
    title: 'Payslips',
    description:
      'Search processed slips; view, print, download, email, or SMS staff.',
    step: 'Output',
    icon: <FileText className="h-5 w-5" />,
    writeHint: 'view / edit for notify'
  },
  {
    href: '/bank-transfer-file',
    title: 'Bank Transfer File',
    description:
      'Build bank upload batches from approved nets; Mark Processed → Paid (blocked until bank format is confirmed).',
    step: 'Output',
    icon: <Landmark className="h-5 w-5" />,
    writeHint: 'add / edit'
  },
  {
    href: '/salary-history',
    title: 'Salary History',
    description:
      'Historical register and staff timeline over past runs and payslips.',
    step: 'History',
    icon: <History className="h-5 w-5" />
  }
];

const PERMISSION_ACTIONS = [
  {
    action: 'view',
    meaning: 'Open Guide and all Payroll screens; export where available'
  },
  {
    action: 'add',
    meaning:
      'Create structures, components, assignments, loans, generate runs, create bank batches'
  },
  {
    action: 'edit',
    meaning:
      'Update masters / assignments, refill / save runs, recalculate / approve / hold, notify payslips'
  },
  {
    action: 'delete',
    meaning: 'Delete masters, assignments, loans, and clear eligible draft runs'
  }
] as const;

export default function PayrollGuideWorkspace() {
  const { has, canAccess } = usePermissions();
  const canViewGuide = has('payroll', 'view') || canAccess('/payroll');

  return (
    <div className="space-y-8">
      <CommonManagerHeader
        title="Payroll Guide"
        description="How payroll is set up, generated, processed, and published — from structures to payslips."
      />

      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" />
            Permissions
          </CardTitle>
          <CardDescription>
            This Guide and every Payroll screen use the single Auth resource{' '}
            <strong>Payroll</strong> (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">payroll</code>
            ). Grant it on the user’s User Group, then re-login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PERMISSION_ACTIONS.map((row) => {
              const granted = has('payroll', row.action);
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
            HR Admin screens (Paysheet Components, HRM Variables, Salary Cycles)
            use their own resources — grant those separately if operators set up
            masters.
          </p>
          {!canViewGuide ? (
            <p className="text-sm text-amber-800 dark:text-amber-300">
              You do not have <strong>view</strong> on Payroll. Ask an admin to
              grant it on your User Group.
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
            Set up structures and assignments → generate a cycle run → process
            statutory math → publish payslips → pay via bank file when ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Structures · Allowances · Deductions
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Assign · Loans · Performance
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Generate
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Process
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              Payslips · Bank · History
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
          <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">What to prepare</h2>
            <p className="text-sm text-muted-foreground">
              Payroll depends on HR Admin masters and staff employment data
              before a cycle can be generated cleanly.
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
                    Payroll
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
                Allowances and Deductions are <strong>views over</strong>{' '}
                Paysheet Components — do not invent a second master collection.
              </li>
              <li>
                Pages must not call Prisma; mutations go through actions →
                services.
              </li>
              <li>
                Bank Transfer File stays on hold until the external bank format
                checklist is locked; do not invent a placeholder upload format.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
