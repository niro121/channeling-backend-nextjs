'use client';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@archmage/ui';
import { Progress } from '@/components/ui/progress';

type LeaveBalanceStats = {
  totalEntitlement: number;
  used: number;
  remaining: number;
  carryForward: number;
};

type UtilisationItem = {
  label: string;
  percent: number;
};

type SectionLeaveBalanceProps = {
  stats?: LeaveBalanceStats;
  utilisations?: UtilisationItem[];
  policyNote?: string;
  policyBadge?: string;
};

const defaultStats: LeaveBalanceStats = {
  totalEntitlement: 31,
  used: 8,
  remaining: 23,
  carryForward: 2
};

const defaultUtilisations: UtilisationItem[] = [
  { label: 'Annual Utilisation', percent: 36 },
  { label: 'Casual Utilisation', percent: 29 }
];

/** UI-only leave balance analytics for the entitlement page. */
export default function SectionLeaveBalance({
  stats = defaultStats,
  utilisations = defaultUtilisations,
  policyNote = 'Carry-forward is capped at 5 days per financial year.',
  policyBadge = 'Policy #LV-04'
}: SectionLeaveBalanceProps) {
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
              <p className="text-base uppercase font-medium text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {item.value}{" "}days
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {utilisations.map((item) => (
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
