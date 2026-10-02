import type { ReactNode } from 'react';
import { Clock, Fingerprint, UserCheck, UserX } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { DailyAttendanceSummary } from '@/types/attendance';

type SummaryCard = {
  label: string;
  value: string;
  subText: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionDailySummaryProps = {
  summary: DailyAttendanceSummary;
};

export default function SectionDailySummary({
  summary
}: SectionDailySummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Present',
      value: String(summary.present),
      subText:
        summary.presentPct != null
          ? `${summary.presentPct}% of scheduled staff`
          : 'No scheduled staff',
      icon: <UserCheck className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Absent',
      value: String(summary.absent),
      subText:
        summary.absentPct != null
          ? `${summary.absentPct}% of scheduled staff`
          : 'No scheduled staff',
      icon: <UserX className="h-4 w-4 text-red-600" />,
      iconWrapClass: 'bg-red-50'
    },
    {
      label: 'Late / Early Out',
      value: String(summary.lateEarlyOut),
      subText: `${summary.lateCount} late, ${summary.earlyOutCount} early out`,
      icon: <Clock className="h-4 w-4 text-orange-600" />,
      iconWrapClass: 'bg-orange-50'
    },
    {
      label: 'Missing Punches',
      value: String(summary.missingPunches),
      subText: 'Requires correction',
      icon: <Fingerprint className="h-4 w-4 text-teal-700" />,
      iconWrapClass: 'bg-teal-50'
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
