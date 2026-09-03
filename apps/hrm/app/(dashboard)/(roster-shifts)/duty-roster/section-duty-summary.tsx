import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Clock } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { DutyRosterSummary, DutyRosterViewMode } from '@/types/roster';

type SummaryCard = {
  label: string;
  value: string;
  subText: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionDutySummaryProps = {
  summary: DutyRosterSummary;
  viewMode?: DutyRosterViewMode;
};

export default function SectionDutySummary({
  summary,
  viewMode = 'daily'
}: SectionDutySummaryProps) {
  const periodLabel =
    viewMode === 'weekly'
      ? 'this week'
      : viewMode === 'monthly'
        ? 'this month'
        : 'this date';
  const cards: SummaryCard[] = [
    {
      label: viewMode === 'daily' ? 'On Duty Today' : 'On Duty',
      value: String(summary.onDutyToday),
      subText: `Allocations ${periodLabel}`,
      icon: <ClipboardList className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Present',
      value: String(summary.present),
      subText: 'Marked present',
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Late Arrivals',
      value: String(summary.lateArrivals),
      subText: 'Marked late',
      icon: <Clock className="h-4 w-4 text-orange-600" />,
      iconWrapClass: 'bg-orange-50'
    },
    {
      label: 'Unfilled Duties',
      value: String(summary.unfilledDuties),
      subText: 'Assigned staff with no cell',
      icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
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
