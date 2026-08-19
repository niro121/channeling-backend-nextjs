import type { ReactNode } from 'react';
import { ArrowUpRight, Clock, Split, Timer } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { OvernightShiftSummary } from '@/types/roster';

type SummaryCard = {
  label: string;
  value: string;
  subText: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionOvernightSummaryProps = {
  summary: OvernightShiftSummary;
};

export default function SectionOvernightSummary({
  summary
}: SectionOvernightSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Overnight Shifts',
      value: String(summary.overnightShifts),
      subText: summary.cycleLabel,
      icon: <ArrowUpRight className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Cross-Midnight Hours',
      value: summary.crossMidnightHours.toLocaleString('en-US'),
      subText: 'Split across two days',
      icon: <Timer className="h-4 w-4 text-sky-700" />,
      iconWrapClass: 'bg-sky-50'
    },
    {
      label: 'Overnight OT Hours',
      value: String(summary.overnightOtHours),
      subText: 'Approved for payroll',
      icon: <Clock className="h-4 w-4 text-orange-600" />,
      iconWrapClass: 'bg-orange-50'
    },
    {
      label: 'Allocation Conflicts',
      value: String(summary.allocationConflicts),
      subText: 'Attendance date mismatch',
      icon: <Split className="h-4 w-4 text-red-600" />,
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
