import type { ReactNode } from 'react';
import { AlertTriangle, Layers, UserCheck, Users } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { ShiftAssignmentSummarySample } from './sample-data';

type SummaryCard = {
  label: string;
  value: string;
  subText: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionAssignmentSummaryProps = {
  summary: ShiftAssignmentSummarySample;
};

export default function SectionAssignmentSummary({
  summary
}: SectionAssignmentSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Assigned Staff',
      value: String(summary.assignedStaff),
      subText: `Of ${summary.activeStaffTotal} active staff`,
      icon: <UserCheck className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Unassigned',
      value: String(summary.unassigned),
      subText: 'Require shift assignment',
      icon: <Users className="h-4 w-4 text-orange-600" />,
      iconWrapClass: 'bg-orange-50'
    },
    {
      label: 'Rotation Patterns',
      value: String(summary.rotationPatterns),
      subText: 'Fixed & rotational',
      icon: <Layers className="h-4 w-4 text-sky-700" />,
      iconWrapClass: 'bg-sky-50'
    },
    {
      label: 'Expiring Soon',
      value: String(summary.expiringSoon),
      subText: 'Effective To within 30 days',
      icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
      iconWrapClass: 'bg-amber-50'
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
