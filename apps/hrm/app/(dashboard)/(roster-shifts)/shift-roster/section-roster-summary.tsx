import type { ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
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

  const conflictItems = summary.conflictItems ?? [];

  return (
    <div className="space-y-3">
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

      {conflictItems.length > 0 ? (
        <Card className="rounded-lg border border-orange-200 bg-orange-50/40 shadow-sm">
          <CardContent className="space-y-3 px-4 py-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
              <div>
                <p className="text-sm font-semibold text-orange-900">
                  Overlapping shifts on the loaded page
                </p>
                <p className="text-xs text-orange-800/80">
                  Same staff and day with overlapping duty windows. Fix in the
                  grid or via Allocate / Amendments.
                  {summary.conflicts > conflictItems.length
                    ? ` Showing first ${conflictItems.length} of ${summary.conflicts}.`
                    : null}
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              {conflictItems.map((item, index) => (
                <li
                  key={`${item.staffId}-${item.dateIso}-${index}`}
                  className="rounded-md border border-orange-200/80 bg-background/80 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-foreground">
                    {item.staffName || 'Staff'}
                    {item.staffCode ? (
                      <span className="ml-1 font-normal text-muted-foreground">
                        ({item.staffCode})
                      </span>
                    ) : null}
                    <span className="mx-1.5 text-muted-foreground">·</span>
                    <span className="font-normal text-muted-foreground">
                      {format(parseISO(item.dateIso), 'EEE dd MMM yyyy')}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
