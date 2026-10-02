import type { ReactNode } from 'react';
import {
  CalendarOff,
  Clock,
  Fingerprint,
  PartyPopper,
  Plane,
  Timer,
  UserCheck,
  Users,
  UserX
} from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { AttendanceSummaryCards } from '@/types/attendance';

type SummaryCard = {
  label: string;
  value: string;
  subText: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionSummaryCardsProps = {
  cards: AttendanceSummaryCards;
};

export default function SectionSummaryCards({
  cards
}: SectionSummaryCardsProps) {
  const items: SummaryCard[] = [
    {
      label: 'Total Staff',
      value: String(cards.totalStaff),
      subText: 'In selected period',
      icon: <Users className="h-4 w-4 text-teal-700" />,
      iconWrapClass: 'bg-teal-50'
    },
    {
      label: 'Present',
      value: String(cards.present),
      subText:
        cards.presentPct != null
          ? `${cards.presentPct}% of staff`
          : 'No staff in range',
      icon: <UserCheck className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Absent',
      value: String(cards.absent),
      subText:
        cards.absentPct != null
          ? `${cards.absentPct}% of staff`
          : 'No staff in range',
      icon: <UserX className="h-4 w-4 text-red-600" />,
      iconWrapClass: 'bg-red-50'
    },
    {
      label: 'Late',
      value: String(cards.late),
      subText: 'Staff with late days',
      icon: <Clock className="h-4 w-4 text-orange-600" />,
      iconWrapClass: 'bg-orange-50'
    },
    {
      label: 'Leave',
      value: String(cards.leave),
      subText: 'Staff with leave days',
      icon: <Plane className="h-4 w-4 text-sky-700" />,
      iconWrapClass: 'bg-sky-50'
    },
    {
      label: 'Day Off',
      value: String(cards.dayOff),
      subText: 'Rostered day off',
      icon: <CalendarOff className="h-4 w-4 text-slate-600" />,
      iconWrapClass: 'bg-slate-100'
    },
    {
      label: 'Holiday',
      value: String(cards.holiday),
      subText: 'Calendar applied',
      icon: <PartyPopper className="h-4 w-4 text-violet-700" />,
      iconWrapClass: 'bg-violet-50'
    },
    {
      label: 'Missing Attendance',
      value: String(cards.missingAttendance),
      subText: 'Needs correction',
      icon: <Fingerprint className="h-4 w-4 text-rose-700" />,
      iconWrapClass: 'bg-rose-50'
    },
    {
      label: 'Overtime',
      value: `${cards.overtimeHours}h`,
      subText: 'From roster OT hours',
      icon: <Timer className="h-4 w-4 text-amber-700" />,
      iconWrapClass: 'bg-amber-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => (
        <Card
          key={item.label}
          className="rounded-lg border border-border shadow-sm"
        >
          <CardContent className="px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium uppercase text-muted-foreground">
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
            <p className="mt-1 text-xs text-muted-foreground">{item.subText}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
