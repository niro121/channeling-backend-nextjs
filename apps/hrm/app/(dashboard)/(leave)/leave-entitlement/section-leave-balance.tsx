'use client';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@archmage/ui';
import { CalendarDays } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { LeaveEntitlementBalanceSummary } from '@/types/leave';

type SectionLeaveBalanceProps = {
  stats?: LeaveEntitlementBalanceSummary | null;
  policyNote?: string;
  policyBadge?: string;
  emptyMessage?: string;
};

const EMPTY_SUMMARY_LABELS = [
  'Total Entitlement',
  'Used',
  'Remaining',
  'Carry Forward'
] as const;

/** Leave balance analytics for the selected employee. */
export default function SectionLeaveBalance({
  stats = null,
  policyNote = 'Balances update when leave applications are approved (Phase 4).',
  policyBadge = 'Entitlement',
  emptyMessage = 'Select an employee to view leave balances.'
}: SectionLeaveBalanceProps) {
  if (!stats) {
    return (
      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-lg font-semibold">Leave Balance</CardTitle>
          <CardDescription>
            Current leave balances for the selected employee.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {EMPTY_SUMMARY_LABELS.map((label) => (
              <div
                key={label}
                className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-3"
              >
                <p className="text-base font-medium uppercase text-muted-foreground/70">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-muted-foreground/40">
                  — days
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/10 px-4 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <CalendarDays className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                No balance to show
              </p>
              <p className="max-w-xs text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const summaryCards = [
    { label: 'Total Entitlement', value: stats.totalEntitlement },
    { label: 'Used', value: stats.used },
    { label: 'Remaining', value: stats.remaining },
    { label: 'Carry Forward', value: stats.carryForward }
  ];

  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-lg font-semibold">Leave Balance</CardTitle>
        <CardDescription>
          Current leave balances for the selected employee.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          {summaryCards.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-border bg-muted/20 px-3 py-3"
            >
              <p className="text-base font-medium uppercase text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                {item.value} days
              </p>
            </div>
          ))}
        </div>

        {stats.utilisations.length > 0 ? (
          <div className="space-y-4">
            {stats.utilisations.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {item.percent}%
                  </span>
                </div>
                <Progress value={item.percent} className="h-2.5" />
              </div>
            ))}
          </div>
        ) : null}

        <div className="rounded-lg border border-border bg-muted px-3 py-3">
          <div className="flex flex-wrap items-start gap-2">
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">
              <span className="font-medium">Note:</span> {policyNote}
            </p>
            <Badge
              variant="secondary"
              className="shrink-0 border-0 bg-primary/10 text-primary hover:bg-primary/10"
            >
              {policyBadge}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
