'use client';

import type { ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  Wallet
} from 'lucide-react';
import { Badge, Card, CardContent } from '@archmage/ui';
import { formatLkrCompact } from '@/lib/utils/currency';
import type { SalaryProcessingSummary } from '@/types/payroll';

type SummaryCard = {
  label: string;
  value: string;
  badgeClass: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionProcessingSummaryProps = {
  summary: SalaryProcessingSummary;
};

export default function SectionProcessingSummary({
  summary
}: SectionProcessingSummaryProps) {
  const periodBadge = summary.periodLabel ?? '—';

  const cards: SummaryCard[] = [
    {
      label: 'Gross Salary',
      value: formatLkrCompact(summary.grossSalary),
      badgeClass: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
      icon: <ArrowUpRight className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Total Deductions',
      value: formatLkrCompact(summary.totalDeductions),
      badgeClass: 'bg-red-100 text-red-700 hover:bg-red-100',
      icon: <ArrowDownRight className="h-4 w-4 text-red-600" />,
      iconWrapClass: 'bg-red-50'
    },
    {
      label: 'Net Payable',
      value: formatLkrCompact(summary.netPayable),
      badgeClass: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
      icon: <Wallet className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'EPF + ETF',
      value: formatLkrCompact(summary.epfEtf),
      badgeClass: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
      icon: <Landmark className="h-4 w-4 text-emerald-700" />,
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
            <Badge className={`mt-2 ${item.badgeClass}`}>{periodBadge}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
