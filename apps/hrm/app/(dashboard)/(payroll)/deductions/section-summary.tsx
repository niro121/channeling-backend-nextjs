import type { ReactNode } from 'react';
import { Banknote, CircleMinus, HandCoins, Wallet } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import { formatAmount } from '@/lib/utils/currency';
import type { DeductionSummary } from '@/types/payroll';

type SummaryCard = {
  label: string;
  value: string;
  subText: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionSummaryProps = {
  summary: DeductionSummary;
};

export default function SectionSummary({ summary }: SectionSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Total Deductions',
      value: formatAmount(summary.totalDeductions),
      subText: 'Fixed + loan + advance components',
      icon: <CircleMinus className="h-4 w-4 text-rose-700" />,
      iconWrapClass: 'bg-rose-50'
    },
    {
      label: 'Fixed',
      value: formatAmount(summary.fixed),
      subText: 'Fixed deduction type',
      icon: <Wallet className="h-4 w-4 text-rose-700" />,
      iconWrapClass: 'bg-rose-50'
    },
    {
      label: 'Loan',
      value: formatAmount(summary.loan),
      subText: 'Loan component type',
      icon: <Banknote className="h-4 w-4 text-orange-700" />,
      iconWrapClass: 'bg-orange-50'
    },
    {
      label: 'Advance',
      value: formatAmount(summary.advance),
      subText: 'Advance component type',
      icon: <HandCoins className="h-4 w-4 text-amber-700" />,
      iconWrapClass: 'bg-amber-50'
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
