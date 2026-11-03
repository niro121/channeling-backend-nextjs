import type { ReactNode } from 'react';
import { CirclePlus, Layers, Percent, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import { formatAmount } from '@/lib/utils/currency';
import type { AllowanceSummary } from '@/types/payroll';

type SummaryCard = {
  label: string;
  value: string;
  subText: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionSummaryProps = {
  summary: AllowanceSummary;
};

export default function SectionSummary({ summary }: SectionSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Total Allowances',
      value: formatAmount(summary.totalAllowances),
      subText: 'Fixed + percentage components',
      icon: <CirclePlus className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Fixed',
      value: formatAmount(summary.fixed),
      subText: 'Fixed allowance type',
      icon: <Layers className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Percentage',
      value: formatAmount(summary.percentage),
      subText: 'Percentage allowance type',
      icon: <Percent className="h-4 w-4 text-sky-700" />,
      iconWrapClass: 'bg-sky-50'
    },
    {
      label: 'Custom',
      value: formatAmount(summary.custom),
      subText: 'Custom kind components',
      icon: <Sparkles className="h-4 w-4 text-violet-700" />,
      iconWrapClass: 'bg-violet-50'
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
