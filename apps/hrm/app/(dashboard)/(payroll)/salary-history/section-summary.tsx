import type { ReactNode } from 'react';
import { CircleDollarSign, FileText, Users, Wallet } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import { formatAmount, formatLkrCompact } from '@/lib/utils/currency';
import type { SalaryHistorySummary } from '@/types/payroll';

type SummaryCard = {
  label: string;
  value: string;
  subText: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionSummaryProps = {
  summary: SalaryHistorySummary;
};

export default function SectionSummary({ summary }: SectionSummaryProps) {
  const period = summary.periodLabel ?? 'Selected period';

  const cards: SummaryCard[] = [
    {
      label: 'Records',
      value: formatAmount(summary.records),
      subText: period,
      icon: <FileText className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Staff',
      value: formatAmount(summary.staffCount),
      subText: period,
      icon: <Users className="h-4 w-4 text-sky-700" />,
      iconWrapClass: 'bg-sky-50'
    },
    {
      label: 'Net Total',
      value: formatLkrCompact(summary.netTotal),
      subText: period,
      icon: <Wallet className="h-4 w-4 text-violet-700" />,
      iconWrapClass: 'bg-violet-50'
    },
    {
      label: 'Paid',
      value: formatAmount(summary.paidCount),
      subText: period,
      icon: <CircleDollarSign className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
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
