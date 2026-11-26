import type {
  EvaluationDecision,
  EvaluationPreviousEntry,
  EvaluationRatingsMap,
  EvaluationRecord,
  EvaluationStatus,
  InterviewType
} from '@/types/recruitment';
import {
  EVALUATION_CRITERIA,
  EVALUATION_DECISION_LABELS,
  EVALUATION_RATINGS,
  type EvaluationCriterionId,
  type EvaluationRating
} from '@/types/recruitment';

function toIso(date?: Date | null): string {
  if (!date) return '';
  return date.toISOString();
}

function toYmd(date?: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseEvaluationRatings(raw: unknown): EvaluationRatingsMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: EvaluationRatingsMap = {};
  const source = raw as Record<string, unknown>;
  for (const id of EVALUATION_CRITERIA) {
    const value = source[id];
    if (
      typeof value === 'string' &&
      (EVALUATION_RATINGS as readonly string[]).includes(value)
    ) {
      out[id as EvaluationCriterionId] = value as EvaluationRating;
    }
  }
  return out;
}

export type EvaluationDbRecord = {
  id: string;
  evaluationCode: string;
  interviewId: string;
  interviewCode: string;
  applicationId: string;
  applicationCode: string;
  candidateName: string;
  jobTitle: string;
  interviewDate: Date;
  interviewer: string;
  interviewType: string;
  interviewStage: string;
  ratings: unknown;
  strengths: string;
  weaknesses: string;
  interviewComments: string;
  recommendation: string;
  finalDecision: string;
  overallScore: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdUser?: { name: string } | null;
  updatedUser?: { name: string } | null;
};

function decisionLabel(decision: string): string {
  if (
    decision &&
    decision in EVALUATION_DECISION_LABELS
  ) {
    return EVALUATION_DECISION_LABELS[decision as EvaluationDecision];
  }
  return decision || 'Evaluation';
}

export function mapPreviousEvaluationEntry(
  record: EvaluationDbRecord
): EvaluationPreviousEntry {
  const stage = record.interviewStage?.trim();
  const title = stage
    ? `${stage} - ${decisionLabel(record.finalDecision || record.recommendation)}`
    : `${record.evaluationCode} - ${decisionLabel(record.finalDecision || record.recommendation)}`;
  return {
    id: record.id,
    title,
    score: record.overallScore,
    by: record.createdUser?.name ?? '',
    at: toYmd(record.interviewDate) || toYmd(record.createdAt)
  };
}

export function mapEvaluationRecord(
  record: EvaluationDbRecord,
  previousEvaluations: EvaluationPreviousEntry[] = []
): EvaluationRecord {
  const recommendation = record.recommendation as EvaluationDecision | '';
  const finalDecision = record.finalDecision as EvaluationDecision | '';

  return {
    id: record.id,
    evaluationCode: record.evaluationCode,
    interviewId: record.interviewId,
    interviewCode: record.interviewCode,
    applicationRefId: record.applicationId,
    applicationId: record.applicationCode,
    candidateName: record.candidateName,
    jobTitle: record.jobTitle,
    interviewDate: toYmd(record.interviewDate),
    interviewer: record.interviewer,
    interviewType: record.interviewType as InterviewType,
    interviewStage: record.interviewStage,
    ratings: parseEvaluationRatings(record.ratings),
    strengths: record.strengths,
    weaknesses: record.weaknesses,
    interviewComments: record.interviewComments,
    recommendation:
      recommendation && recommendation in EVALUATION_DECISION_LABELS
        ? recommendation
        : '',
    finalDecision:
      finalDecision && finalDecision in EVALUATION_DECISION_LABELS
        ? finalDecision
        : '',
    overallScore: record.overallScore,
    status: record.status as EvaluationStatus,
    previousEvaluations,
    createdAt: toIso(record.createdAt),
    createdBy: record.createdUser?.name ?? '',
    updatedAt: toIso(record.updatedAt),
    updatedBy: record.updatedUser?.name ?? ''
  };
}
