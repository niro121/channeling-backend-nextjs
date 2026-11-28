import type { ReactNode } from 'react';
import { Award, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { PerformanceSummary } from '@/types/performance';

type SummaryCard = {
  label: string;
  value: number;
  icon?: ReactNode;
  iconWrapClass?: string;
};

type SectionSummaryProps = {
  summary: PerformanceSummary;
};

export default function SectionSummary({ summary }: SectionSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Evaluations Due',
      value: summary.evaluationsDue,
      icon: <Award className="h-4 w-4 text-amber-700" />,
      iconWrapClass: 'bg-amber-50'
    },
    {
      label: 'Probation Reviews',
      value: summary.probationReviews
    },
    {
      label: 'Promotions (YTD)',
      value: summary.promotionsYtd,
      icon: <TrendingUp className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Warnings Issued',
      value: summary.warningsIssued
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((item) => (
        <Card key={item.label} className="rounded-lg border border-border shadow-sm">
          <CardContent className="px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              {item.icon ? (
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.iconWrapClass ?? ''}`}
                >
                  {item.icon}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
              {item.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
