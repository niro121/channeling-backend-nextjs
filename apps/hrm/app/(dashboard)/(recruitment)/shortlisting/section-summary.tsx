import type { ReactNode } from 'react';
import { ClipboardList, PauseCircle, Star, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { ShortlistingSummary } from '@/types/recruitment';

type SummaryCard = {
  label: string;
  value: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionSummaryProps = {
  summary: ShortlistingSummary;
};

export default function SectionSummary({ summary }: SectionSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'To Review',
      value: String(summary.toReview),
      icon: <ClipboardList className="h-4 w-4 text-sky-700" />,
      iconWrapClass: 'bg-sky-50'
    },
    {
      label: 'Shortlisted',
      value: String(summary.shortlisted),
      icon: <UserCheck className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'On Hold',
      value: String(summary.onHold),
      icon: <PauseCircle className="h-4 w-4 text-amber-700" />,
      iconWrapClass: 'bg-amber-50'
    },
    {
      label: 'Avg. Screening Score',
      value: String(summary.avgScreeningScore),
      icon: <Star className="h-4 w-4 text-violet-700" />,
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
