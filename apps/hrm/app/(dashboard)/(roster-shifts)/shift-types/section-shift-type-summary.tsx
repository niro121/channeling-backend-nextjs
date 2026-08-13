import type { ReactNode } from 'react';
import { Clock, Moon, ShieldCheck, Sun } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { ShiftTypeSummarySample } from './sample-data';

type SummaryCard = {
  label: string;
  value: string;
  subText: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionShiftTypeSummaryProps = {
  summary: ShiftTypeSummarySample;
};

export default function SectionShiftTypeSummary({
  summary
}: SectionShiftTypeSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Total Shift Types',
      value: String(summary.total),
      subText: `${summary.categories} categories`,
      icon: <Clock className="h-4 w-4 text-teal-700" />,
      iconWrapClass: 'bg-teal-50'
    },
    {
      label: 'Active',
      value: String(summary.active),
      subText: 'Available for assignment',
      icon: <Sun className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Night / Overnight',
      value: String(summary.nightOrOvernight),
      subText: 'Allowance eligible',
      icon: <Moon className="h-4 w-4 text-slate-600" />,
      iconWrapClass: 'bg-slate-100'
    },
    {
      label: 'Holiday Eligible',
      value: String(summary.holidayEligible),
      subText: 'Gazetted holiday duty',
      icon: <ShieldCheck className="h-4 w-4 text-orange-600" />,
      iconWrapClass: 'bg-orange-50'
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
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.iconWrapClass}`}
              >
                {item.icon}
              </span>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {item.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{item.subText}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
