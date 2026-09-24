import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { OvertimeSummarySample } from './sample-data';

type SummaryCard = {
  label: string;
  value: string;
  icon?: ReactNode;
};

type SectionOtSummaryProps = {
  summary: OvertimeSummarySample;
  approvedMonthLabel: string;
};

function formatHours(hours: number): string {
  return `${hours.toLocaleString('en-US')}h`;
}

export default function SectionOtSummary({
  summary,
  approvedMonthLabel
}: SectionOtSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Pending',
      value: String(summary.pending),
      icon: <Clock className="h-4 w-4 text-orange-500" />
    },
    {
      label: approvedMonthLabel,
      value: String(summary.approvedMonth)
    },
    {
      label: 'Total OT Hours',
      value: formatHours(summary.totalHours)
    },
    {
      label: 'OT Cost',
      value: summary.costLabel
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((item) => (
        <Card
          key={item.label}
          className="rounded-lg border border-border shadow-sm"
        >
          <CardContent className="px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-medium uppercase text-muted-foreground">
                {item.label}
              </p>
              {item.icon}
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {item.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
