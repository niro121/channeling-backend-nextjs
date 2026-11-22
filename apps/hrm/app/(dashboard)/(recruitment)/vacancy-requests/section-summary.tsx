import type { ReactNode } from 'react';
import { Briefcase, CheckCircle2, Clock3, Users } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { VacancyRequestSummary } from '@/types/recruitment';

type SummaryCard = {
  label: string;
  value: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionSummaryProps = {
  summary: VacancyRequestSummary;
};

export default function SectionSummary({ summary }: SectionSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Open Requests',
      value: String(summary.openRequests),
      icon: <Briefcase className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Pending Approval',
      value: String(summary.pendingApproval),
      icon: <Clock3 className="h-4 w-4 text-orange-600" />,
      iconWrapClass: 'bg-orange-50'
    },
    {
      label: 'Approved',
      value: String(summary.approved),
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Total Positions',
      value: String(summary.totalPositions),
      icon: <Users className="h-4 w-4 text-sky-700" />,
      iconWrapClass: 'bg-sky-50'
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
