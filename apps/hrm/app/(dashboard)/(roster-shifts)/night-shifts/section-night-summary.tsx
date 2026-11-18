'use client';

import type { ReactNode } from 'react';
import { BedDouble, Coins, Moon, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { NightShiftSummary } from '@/types/roster';

type SummaryCard = {
  label: string;
  value: string;
  subText: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionNightSummaryProps = {
  summary: NightShiftSummary;
};

export default function SectionNightSummary({
  summary
}: SectionNightSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Night Shifts This Cycle',
      value: String(summary.nightShiftsThisCycle),
      subText: summary.cycleLabel || 'Current filter range',
      icon: <Moon className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Staff on Night Duty',
      value: String(summary.staffOnNightDuty),
      subText: summary.staffUnitsLabel,
      icon: <BedDouble className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Night Allowance Payable',
      value: summary.nightAllowancePayable,
      subText: 'Incl. meal allowance',
      icon: <Coins className="h-4 w-4 text-sky-700" />,
      iconWrapClass: 'bg-sky-50'
    },
    {
      label: 'Consecutive Night Alerts',
      value: String(summary.consecutiveNightAlerts),
      subText: 'More than 3 nights in a row',
      icon: <ShieldAlert className="h-4 w-4 text-red-600" />,
      iconWrapClass: 'bg-red-50'
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
