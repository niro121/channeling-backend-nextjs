import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  computeEvaluationScore,
  type EvaluationRecord
} from '@/types/recruitment';
import EvaluationWorkspace from './evaluation-workspace';
import { SAMPLE_EVALUATIONS } from './sample-data';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    interviewId?: string;
    evaluationId?: string;
  }>;
};

function resolveActiveRecord(
  records: EvaluationRecord[],
  interviewId?: string,
  evaluationId?: string
): EvaluationRecord {
  if (evaluationId) {
    const byEval = records.find((r) => r.id === evaluationId);
    if (byEval) return byEval;
  }
  if (interviewId) {
    const byInterview = records.find((r) => r.interviewId === interviewId);
    if (byInterview) return byInterview;
  }
  const draft = records.find((r) => r.status === 'draft');
  return draft ?? records[0]!;
}

export default async function EvaluationPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/evaluation');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'evaluation.visited',
      entityType: 'Evaluation',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const pageSize = process.env.DEFAULT_PER_PAGE
    ? Number(process.env.DEFAULT_PER_PAGE)
    : 10;
  const pageNumber = params?.page ? Math.max(1, Number(params.page) || 1) : 1;
  const start = (pageNumber - 1) * pageSize;
  const pageRecords = SAMPLE_EVALUATIONS.slice(start, start + pageSize);

  const active = resolveActiveRecord(
    SAMPLE_EVALUATIONS,
    params?.interviewId,
    params?.evaluationId
  );
  const { score } = computeEvaluationScore(active.ratings);
  const initialActive: EvaluationRecord = {
    ...active,
    overallScore: score
  };

  return (
    <EvaluationWorkspace
      initialRecords={pageRecords}
      totalRecords={SAMPLE_EVALUATIONS.length}
      initialActive={initialActive}
      page={params?.page}
    />
  );
}
