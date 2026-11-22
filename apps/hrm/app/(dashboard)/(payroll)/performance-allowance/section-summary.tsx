import type { ReactNode } from 'react';
import { DollarSign, Percent, Users } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import { formatAmount, formatLkrCompact } from '@/lib/utils/currency';
import type {
  PerformanceAllowanceMode,
  PerformanceAllowanceSummary
} from '@/types/payroll';

type SummaryCard = {
  label: string;
  value: string;
  subText: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionSummaryProps = {
  mode: PerformanceAllowanceMode;
  summary: PerformanceAllowanceSummary;
};

export default function SectionSummary({
  mode,
  summary
}: SectionSummaryProps) {
  const averageLabel =
    mode === 'percentage' ? 'Avg. Percentage' : 'Avg. Value';
  const averageValue =
    mode === 'percentage'
      ? `${formatAmount(summary.averageMetric, {
          maximumFractionDigits: 1
        })}%`
      : formatLkrCompact(summary.averageMetric);

  const cards: SummaryCard[] = [
    {
      label: 'Staff on Allowance',
      value: formatAmount(summary.staffOnAllowance),
      subText: 'Active in current mode',
      icon: <Users className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: averageLabel,
      value: averageValue,
      subText:
        mode === 'percentage'
          ? 'Mean percentage across staff'
          : 'Mean fixed value across staff',
      icon:
        mode === 'percentage' ? (
          <Percent className="h-4 w-4 text-sky-700" />
        ) : (
          <DollarSign className="h-4 w-4 text-sky-700" />
        ),
      iconWrapClass: 'bg-sky-50'
    },
    {
      label: 'Total Monthly Value',
      value: formatLkrCompact(summary.totalMonthlyValue),
      subText: 'Estimated monthly impact',
      icon: <DollarSign className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
