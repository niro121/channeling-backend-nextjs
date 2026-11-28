import { Award, CheckCircle2, Clock, Users } from 'lucide-react';
import type { PromotionSummary } from '@/types/performance';
import PerformanceStatCards from '../_components/performance-stat-cards';

type SectionSummaryProps = {
  summary: PromotionSummary;
};

export default function SectionSummary({ summary }: SectionSummaryProps) {
  return (
    <PerformanceStatCards
      items={[
        {
          label: 'Total Promotion Requests',
          value: summary.totalRequests,
          icon: <Users className="h-4 w-4 text-emerald-700" />,
          iconWrapClass: 'bg-emerald-50'
        },
        {
          label: 'Pending Approval',
          value: summary.pendingApproval,
          icon: <Clock className="h-4 w-4 text-slate-700" />,
          iconWrapClass: 'bg-slate-100'
        },
        {
          label: 'Approved Promotions',
          value: summary.approvedPromotions,
          icon: <Award className="h-4 w-4 text-amber-700" />,
          iconWrapClass: 'bg-amber-50'
        },
        {
          label: 'Promotions Effective This Month',
          value: summary.effectiveThisMonth,
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-700" />,
          iconWrapClass: 'bg-emerald-50'
        }
      ]}
    />
  );
}
