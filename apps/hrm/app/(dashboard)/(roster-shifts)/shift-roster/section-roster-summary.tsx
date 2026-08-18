import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Users
} from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { RosterGridSummary } from '@/types/roster';

type SummaryCard = {
  label: string;
  value: string;
  subText: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionRosterSummaryProps = {
  summary: RosterGridSummary;
  weekRangeShort: string;
};

export default function SectionRosterSummary({
  summary,
  weekRangeShort
}: SectionRosterSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Staff Rostered',
      value: summary.staffRostered.toLocaleString('en-US'),
      subText: `Across ${summary.departments} departments`,
      icon: <Users className="h-4 w-4 text-teal-700" />,
      iconWrapClass: 'bg-teal-50'
    },
    {
      label: 'Shifts This Week',
      value: summary.shiftsThisWeek.toLocaleString('en-US'),
      subText: `Weekly view - ${weekRangeShort}`,
      icon: <CalendarDays className="h-4 w-4 text-teal-700" />,
      iconWrapClass: 'bg-teal-50'
    },
    {
      label: 'Total Hours',
      value: summary.totalHours.toLocaleString('en-US'),
      subText: 'Planned working hours',
      icon: <Clock className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Conflicts',
      value: String(summary.conflicts),
      subText:
        summary.conflicts === 0
          ? 'No overlapping allocations'
          : 'Overlapping allocations found',
      icon: <AlertTriangle className="h-4 w-4 text-orange-600" />,
      iconWrapClass: 'bg-orange-50'
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
