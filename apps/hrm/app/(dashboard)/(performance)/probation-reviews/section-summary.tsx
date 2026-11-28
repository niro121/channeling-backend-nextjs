import { Award, CheckCircle2, Clock, Users } from 'lucide-react';
import type { ProbationReviewSummary } from '@/types/performance';
import PerformanceStatCards from '../_components/performance-stat-cards';

type SectionSummaryProps = {
  summary: ProbationReviewSummary;
};

export default function SectionSummary({ summary }: SectionSummaryProps) {
  return (
    <PerformanceStatCards
      items={[
        {
          label: 'Total Staff on Probation',
          value: summary.totalOnProbation,
          icon: <Users className="h-4 w-4 text-emerald-700" />,
          iconWrapClass: 'bg-emerald-50'
        },
        {
          label: 'Reviews Due',
          value: summary.reviewsDue,
          icon: <Clock className="h-4 w-4 text-slate-700" />,
          iconWrapClass: 'bg-slate-100'
        },
        {
          label: 'Reviews Overdue',
          value: summary.reviewsOverdue,
          icon: <Award className="h-4 w-4 text-amber-700" />,
          iconWrapClass: 'bg-amber-50'
        },
        {
          label: 'Reviews Completed',
          value: summary.reviewsCompleted,
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-700" />,
          iconWrapClass: 'bg-emerald-50'
        }
      ]}
    />
  );
}
