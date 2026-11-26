import type { ReactNode } from 'react';
import { Fingerprint } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { RfidAttendanceSummary } from '@/types/attendance';

type SectionRfidSummaryProps = {
  summary: RfidAttendanceSummary;
};

function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

function formatPct(n: number | null): string | null {
  if (n == null) return null;
  return `${n}%`;
}

export default function SectionRfidSummary({ summary }: SectionRfidSummaryProps) {
  const cards: {
    label: string;
    value: string;
    hint?: string | null;
    icon?: ReactNode;
  }[] = [
    {
      label: 'Today Present',
      value: formatCount(summary.present),
      hint: formatPct(summary.presentPct),
      icon: <Fingerprint className="h-4 w-4 text-emerald-600" />
    },
    {
      label: 'Late',
      value: formatCount(summary.late),
      hint: summary.lateAfterLabel
    },
    {
      label: 'Missing Punches',
      value: formatCount(summary.missingPunches),
      hint: summary.missingPunches > 0 ? 'Needs review' : null
    },
    {
      label: 'Absent',
      value: formatCount(summary.absent),
      hint: formatPct(summary.absentPct)
    },
    {
      label: 'Exceptions',
      value: formatCount(summary.exceptions),
      hint: summary.exceptions > 0 ? 'Flagged' : null
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((item) => (
        <Card
          key={item.label}
          className="rounded-lg border border-border shadow-sm"
        >
          <CardContent className="px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              {item.icon}
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {item.value}
            </p>
            {item.hint ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
