import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getEvaluationByIdAction,
  getEvaluationsAction,
  getOrCreateEvaluationForInterviewAction
} from '@/app/actions/recruitment-actions/evaluation.actions';
import {
  EMPTY_EVALUATION_RECORD,
  computeEvaluationScore,
  type EvaluationRecord
} from '@/types/recruitment';
import EvaluationWorkspace from './evaluation-workspace';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    interviewId?: string;
    evaluationId?: string;
    status?: string;
    search?: string;
  }>;
};

function withScore(record: EvaluationRecord): EvaluationRecord {
  const { score } = computeEvaluationScore(record.ratings);
  return { ...record, overallScore: score };
}

async function resolveActiveRecord(
  records: EvaluationRecord[],
  interviewId?: string,
  evaluationId?: string
): Promise<EvaluationRecord> {
  if (evaluationId) {
    const byId = await getEvaluationByIdAction(evaluationId);
    if (!byId.isError && byId.data) return withScore(byId.data);
  }

  if (interviewId) {
    const fromInterview =
      await getOrCreateEvaluationForInterviewAction(interviewId);
    if (!fromInterview.isError && fromInterview.data) {
      return withScore(fromInterview.data);
    }
  }

  const draft = records.find((r) => r.status === 'draft');
  if (draft) return withScore(draft);
  if (records[0]) return withScore(records[0]);
  return EMPTY_EVALUATION_RECORD;
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
  const listRes = await getEvaluationsAction({
    page: params?.page,
    limit: process.env.DEFAULT_PER_PAGE,
    status: params?.status,
    search: params?.search
  });

  const pageRecords = listRes.isError ? [] : (listRes.data?.data ?? []);
  const totalRecords = listRes.isError
    ? 0
    : (listRes.data?.totalRecords ?? 0);

  const initialActive = await resolveActiveRecord(
    pageRecords,
    params?.interviewId,
    params?.evaluationId
  );

  return (
    <EvaluationWorkspace
      initialRecords={pageRecords}
      totalRecords={totalRecords}
      initialActive={initialActive}
      page={params?.page}
    />
  );
}
