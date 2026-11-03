'use client';

import type { ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Users,
  Wallet
} from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import { formatAmount, formatLkrCompact } from '@/lib/utils/currency';
import type { SalaryGenerationSummary } from '@/types/payroll';

type SummaryCard = {
  label: string;
  value: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionSalarySummaryProps = {
  summary: SalaryGenerationSummary;
};

export default function SectionSalarySummary({
  summary
}: SectionSalarySummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Total Earnings',
      value: formatLkrCompact(summary.totalEarnings),
      icon: <ArrowUpRight className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Total Deductions',
      value: formatLkrCompact(summary.totalDeductions),
      icon: <ArrowDownRight className="h-4 w-4 text-red-600" />,
      iconWrapClass: 'bg-red-50'
    },
    {
      label: 'Net Payable',
      value: formatLkrCompact(summary.netPayable),
      icon: <Wallet className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Employees',
      value: formatAmount(summary.employeeCount),
      icon: <Users className="h-4 w-4 text-emerald-700" />,
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
