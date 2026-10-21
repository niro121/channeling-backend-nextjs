import type { ReactNode } from 'react';
import { CalendarDays, Landmark, UserCheck, Wallet } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { PublicHolidayShiftSummary } from '@/types/roster';

type SummaryCard = {
  label: string;
  value: string;
  subText: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionHolidaySummaryProps = {
  summary: PublicHolidayShiftSummary;
};

export default function SectionHolidaySummary({
  summary
}: SectionHolidaySummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Holiday Duties',
      value: String(summary.holidayDuties),
      subText: summary.cycleLabel,
      icon: <CalendarDays className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Staff on Holiday Duty',
      value: String(summary.staffOnHolidayDuty),
      subText: 'Rostered on gazetted days',
      icon: <UserCheck className="h-4 w-4 text-sky-700" />,
      iconWrapClass: 'bg-sky-50'
    },
    {
      label: 'Holiday Pay Payable',
      value: summary.holidayPayPayableLabel,
      subText: 'Estimated for this cycle',
      icon: <Wallet className="h-4 w-4 text-orange-600" />,
      iconWrapClass: 'bg-orange-50'
    },
    {
      label: 'Lieu Days Granted',
      value: String(summary.lieuDaysGranted),
      subText: 'In place of extra pay',
      icon: <Landmark className="h-4 w-4 text-violet-700" />,
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
