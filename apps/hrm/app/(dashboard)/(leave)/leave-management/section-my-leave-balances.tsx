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
  emptyMessage?: string;
};

function getPercent(used: number, total: number | null): number {
  if (total == null || total <= 0) return used > 0 ? 4 : 0;
  return Math.min(100, Math.round((used / total) * 100));
}

function formatRatio(used: number, total: number | null): string {
  return `${used} / ${total == null ? '—' : total}`;
}

export default function SectionMyLeaveBalances({
  items = [],
  emptyMessage = 'No leave entitlements linked to your staff profile.'
}: SectionMyLeaveBalancesProps) {
  return (
    <Card className="h-full rounded-lg border border-border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">My Leave Balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          items.map((item) => (
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
          ))
        )}
      </CardContent>
    </Card>
  );
}
