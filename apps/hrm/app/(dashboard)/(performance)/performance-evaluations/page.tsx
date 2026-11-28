import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import {
  MOCK_LETTER_SUMMARIES,
  MOCK_PERFORMANCE_SUMMARY,
  MOCK_RECENT_EVALUATIONS
} from '@/types/performance';
import PerformanceEvaluationsWorkspace from './performance-evaluations-workspace';

export default async function PerformanceEvaluationsPage() {
  const canView = await checkRouteAccess('/performance-evaluations');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  return (
    <PerformanceEvaluationsWorkspace
      summary={MOCK_PERFORMANCE_SUMMARY}
      recentEvaluations={MOCK_RECENT_EVALUATIONS}
      letters={MOCK_LETTER_SUMMARIES}
    />
  );
}
