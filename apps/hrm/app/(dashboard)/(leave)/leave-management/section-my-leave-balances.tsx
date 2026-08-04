'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@archmage/ui';
import { Progress } from '@/components/ui/progress';

export type LeaveBalanceItem = {
  id: string;
  label: string;
  used: number;
  /** null means unlimited / no cap (shown as —) */
  total: number | null;
  /** Tailwind classes for the progress fill */
  indicatorClassName: string;
};

type SectionMyLeaveBalancesProps = {
  items?: LeaveBalanceItem[];
};

const sampleBalances: LeaveBalanceItem[] = [
  {
    id: 'annual',
    label: 'Annual',
    used: 14,
    total: 21,
    indicatorClassName: 'bg-teal-700'
  },
  {
    id: 'casual',
    label: 'Casual',
    used: 4,
    total: 7,
    indicatorClassName: 'bg-teal-700'
  },
  {
    id: 'medical',
    label: 'Medical',
    used: 12,
    total: 14,
    indicatorClassName: 'bg-emerald-500'
  },
  {
    id: 'maternity',
    label: 'Maternity',
    used: 84,
    total: 84,
    indicatorClassName: 'bg-slate-500'
  },
  {
    id: 'no-pay',
    label: 'No Pay',
    used: 0,
    total: null,
    indicatorClassName: 'bg-slate-400'
  }
];

function getPercent(used: number, total: number | null): number {
  if (total == null || total <= 0) return used > 0 ? 4 : 0;
  return Math.min(100, Math.round((used / total) * 100));
}

function formatRatio(used: number, total: number | null): string {
  return `${used} / ${total == null ? '—' : total}`;
}

/** UI-only my leave balances card with progress bars. */
export default function SectionMyLeaveBalances({
  items = sampleBalances
}: SectionMyLeaveBalancesProps) {
  return (
    <Card className="rounded-lg border border-border shadow-sm h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">My Leave Balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {items.map((item) => (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">
                {item.label}
              </span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {formatRatio(item.used, item.total)}
              </span>
            </div>
            <Progress
              value={getPercent(item.used, item.total)}
              className="h-2 bg-muted"
              indicatorClassName={item.indicatorClassName}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
