'use server';

import { randomUUID } from 'crypto';
import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import { notifyCandidate } from '@/lib/helpers/recruitment/notify-candidate';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import {
  mapEvaluationRecord,
  mapPreviousEvaluationEntry,
  parseEvaluationRatings,
  type EvaluationDbRecord
} from '@/lib/mappers/evaluation.mapper';
import { evaluationOutcomeEmailTemplate } from '@/lib/templates/email/recruitment';
import { evaluationOutcomeSmsTemplate } from '@/lib/templates/sms/recruitment';
import {
  EVALUATION_CODE_PREFIX,
  EVALUATION_CRITERIA,
  EVALUATION_DECISIONS,
  EVALUATION_RATINGS,
  EVALUATION_STATUSES,
  computeEvaluationScore,
  type EvaluationPayload,
  type EvaluationRecord,
  type GetEvaluationsParams
} from '@/types/recruitment';

const ratingSchema = z.enum(EVALUATION_RATINGS);
const decisionSchema = z.enum(EVALUATION_DECISIONS);
const statusSchema = z.enum(EVALUATION_STATUSES);

const ratingsSchema = z
  .record(z.string(), ratingSchema)
  .superRefine((value, ctx) => {
    for (const key of Object.keys(value)) {
      if (!(EVALUATION_CRITERIA as readonly string[]).includes(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown criterion: ${key}`,
          path: [key]
        });
      }
    }
  });

const evaluationPayloadSchema = z.object({
  ratings: ratingsSchema.default({}),
  strengths: z.string().trim().optional().default(''),
  weaknesses: z.string().trim().optional().default(''),
  interviewComments: z.string().trim().optional().default(''),
  recommendation: z
    .union([decisionSchema, z.literal('')])
    .optional()
    .default(''),
  finalDecision: z
    .union([decisionSchema, z.literal('')])
    .optional()
    .default('')
});

function parseInterviewDate(value: Date | string): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      0,
      0,
      0,
      0
    );
  }
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return null;
      return new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
        0,
        0,
        0,
        0
      );
    }
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      0,
      0,
      0,
      0
    );
  }
  return null;
}

function buildEvaluationWhere(
  params: GetEvaluationsParams
): Prisma.EvaluationWhereInput {
  const and: Prisma.EvaluationWhereInput[] = [];

  if (params.status?.trim()) {
    const parsed = statusSchema.safeParse(params.status.trim());
    if (parsed.success) and.push({ status: parsed.data });
  }

  if (params.interviewType?.trim()) {
    and.push({ interviewType: params.interviewType.trim() });
  }

  if (params.decision?.trim()) {
    const parsed = decisionSchema.safeParse(params.decision.trim());
    if (parsed.success) and.push({ finalDecision: parsed.data });
  }

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        {
          candidateName: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          jobTitle: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          evaluationCode: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          interviewCode: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          interviewer: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        }
      ]
    });
  }

  return and.length ? { AND: and } : {};
}

function historyEntry(
  title: string,
  detail: string,
  userLabel: string
): {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: Date;
} {
  return {
    id: randomUUID(),
    title,
    detail,
    userLabel,
    at: new Date()
  };
}

function actorLabel(user?: AuditUser | null): string {
  return user?.name?.trim() || 'System';
}

async function attachPreviousEvaluations(
  records: EvaluationDbRecord[]
): Promise<EvaluationRecord[]> {
  if (!records.length) return [];

  const applicationIds = [
    ...new Set(records.map((r) => r.applicationId).filter(Boolean))
  ];

  const previousRows =
    applicationIds.length === 0
      ? []
      : await prisma.evaluation.findMany({
          where: {
            applicationId: { in: applicationIds },
            status: 'submitted'
          },
          orderBy: [{ interviewDate: 'asc' }, { createdAt: 'asc' }]
        });

  const previousWithUsers = await resolveAuthUsers(previousRows);
  const byApplication = new Map<string, EvaluationDbRecord[]>();
  for (const row of previousWithUsers) {
    const list = byApplication.get(row.applicationId) ?? [];
    list.push(row);
    byApplication.set(row.applicationId, list);
  }

  return records.map((record) => {
    const siblings = byApplication.get(record.applicationId) ?? [];
    const previous = siblings
      .filter((s) => s.id !== record.id)
      .map(mapPreviousEvaluationEntry);
    return mapEvaluationRecord(record, previous);
  });
}

export async function getEvaluations(params: GetEvaluationsParams): Promise<{
  success: boolean;
  data?: { records: EvaluationRecord[]; totalRecords: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const pageNumber = Math.max(
      1,
      Number.parseInt(params.page ?? process.env.DEFAULT_PAGE ?? '0', 10) || 1
    );
    const defaultPerPage = process.env.DEFAULT_PER_PAGE ?? '10';
    const maxPageSize =
      Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '500', 10) || 500;
    const pageSize = Math.min(
      maxPageSize,
      Math.max(
        1,
        Number.parseInt(params.limit ?? defaultPerPage, 10) ||
          Number.parseInt(defaultPerPage, 10) ||
          10
      )
    );
    const skip = (pageNumber - 1) * pageSize;
    const where = buildEvaluationWhere(params);

    const [rows, totalRecords] = await Promise.all([
      prisma.evaluation.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ updatedAt: 'desc' }]
      }),
      prisma.evaluation.count({ where })
    ]);

    const withUsers = await resolveAuthUsers(rows);
    const records = await attachPreviousEvaluations(withUsers);

    return {
      success: true,
      data: { records, totalRecords },
      message: 'Evaluations fetched successfully'
    };
  } catch (error: any) {
    console.error('getEvaluations error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch evaluations' }
    };
  }
}

export async function getEvaluationsForExport(
  params: Omit<GetEvaluationsParams, 'page' | 'limit'>
): Promise<{
  success: boolean;
  data?: EvaluationRecord[];
  totalRecords?: number;
  error?: { message?: string };
}> {
  try {
    const where = buildEvaluationWhere(params);
    const rows = await prisma.evaluation.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }]
    });
    const withUsers = await resolveAuthUsers(rows);
    const records = await attachPreviousEvaluations(withUsers);
    return { success: true, data: records, totalRecords: records.length };
  } catch (error: any) {
    console.error('getEvaluationsForExport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export evaluations' }
    };
  }
}

export async function getEvaluationById(id: string): Promise<{
  success: boolean;
  data?: EvaluationRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid evaluation ID' } };
    }
    const row = await prisma.evaluation.findUnique({ where: { id } });
    if (!row) {
      return { success: false, error: { message: 'Evaluation not found' } };
    }
    const [withUsers] = await resolveAuthUsers([row]);
    const [mapped] = await attachPreviousEvaluations([withUsers]);
    return { success: true, data: mapped };
  } catch (error: any) {
    console.error('getEvaluationById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch evaluation' }
    };
  }
}

/**
 * Load evaluation for an interview, creating a draft from interview snapshot if missing.
 */
export async function getOrCreateEvaluationForInterview(
  interviewId: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: EvaluationRecord;
  created?: boolean;
  error?: { message?: string };
}> {
  try {
    if (!interviewId) {
      return { success: false, error: { message: 'Invalid interview ID' } };
    }

    const existing = await prisma.evaluation.findUnique({
      where: { interviewId }
    });
    if (existing) {
      const [withUsers] = await resolveAuthUsers([existing]);
      const [mapped] = await attachPreviousEvaluations([withUsers]);
      return { success: true, data: mapped, created: false };
    }

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId }
    });
    if (!interview) {
      return { success: false, error: { message: 'Interview not found' } };
    }
    if (interview.status === 'cancelled') {
      return {
        success: false,
        error: { message: 'Cannot evaluate a cancelled interview' }
      };
    }

    const generated = await generateRecordCode(EVALUATION_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: {
          message: 'Failed to generate evaluation code. Please try again.'
        }
      };
    }

    const auditUser = toAuditUser(user);
    const interviewDate =
      parseInterviewDate(interview.interviewDate) ?? interview.interviewDate;

    const created = await prisma.evaluation.create({
      data: {
        evaluationCode: generated.code,
        interviewId: interview.id,
        interviewCode: interview.interviewCode,
        applicationId: interview.applicationId,
        applicationCode: interview.applicationCode,
        candidateName: interview.candidateName,
        jobTitle: interview.jobTitle,
        interviewDate,
        interviewer: interview.interviewerPanel,
        interviewType: interview.interviewType,
        interviewStage: '',
        ratings: {},
        strengths: '',
        weaknesses: '',
        interviewComments: '',
        recommendation: '',
        finalDecision: '',
        overallScore: 0,
        status: 'draft',
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      }
    });

    const [withUsers] = await resolveAuthUsers([created]);
    const [mapped] = await attachPreviousEvaluations([withUsers]);
    return { success: true, data: mapped, created: true };
  } catch (error: any) {
    console.error('getOrCreateEvaluationForInterview error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to load evaluation for interview'
      }
    };
  }
}

async function updateEvaluationContent(
  id: string,
  payload: EvaluationPayload,
  opts: { submit: boolean; user?: AuditUser }
): Promise<{
  success: boolean;
  data?: EvaluationRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid evaluation ID' } };
    }

    const parsed = evaluationPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      const issues: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || 'form';
        issues[key] = [...(issues[key] ?? []), issue.message];
      }
      return {
        success: false,
        error: { message: 'Validation failed', issues }
      };
    }

    const existing = await prisma.evaluation.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'Evaluation not found' } };
    }
    if (existing.status === 'submitted') {
      return {
        success: false,
        error: { message: 'Submitted evaluations are locked and cannot be edited' }
      };
    }

    const data = parsed.data;
    if (opts.submit) {
      if (!data.recommendation) {
        return {
          success: false,
          error: {
            message: 'Validation failed',
            issues: { recommendation: ['Recommendation is required'] }
          }
        };
      }
      if (!data.finalDecision) {
        return {
          success: false,
          error: {
            message: 'Validation failed',
            issues: { finalDecision: ['Final decision is required'] }
          }
        };
      }
    }

    const ratings = parseEvaluationRatings(data.ratings);
    const { score } = computeEvaluationScore(ratings);
    const auditUser = toAuditUser(opts.user);
    const actor = actorLabel(auditUser);

    const updated = await prisma.evaluation.update({
      where: { id },
      data: {
        ratings,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        interviewComments: data.interviewComments,
        recommendation: data.recommendation,
        finalDecision: data.finalDecision,
        overallScore: score,
        status: opts.submit ? 'submitted' : 'draft',
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    if (opts.submit) {
      const application = await prisma.application.findUnique({
        where: { id: existing.applicationId }
      });
      const positive =
        data.finalDecision === 'recommended' ||
        data.finalDecision === 'recommended_with_conditions';
      if (application && application.status === 'active') {
        await prisma.application.update({
          where: { id: application.id },
          data: {
            ...(positive ? { currentStage: 'selected' } : {}),
            history: [
              ...(application.history ?? []),
              historyEntry(
                'Evaluation submitted',
                `${updated.evaluationCode} · score ${score}`,
                actor
              )
            ],
            ...(auditUser?.id && { updatedBy: auditUser.id })
          }
        });
      }

      // Mark interview completed when evaluation is submitted.
      if (
        existing.interviewId &&
        (await prisma.interview.findUnique({
          where: { id: existing.interviewId },
          select: { status: true }
        }))?.status !== 'cancelled'
      ) {
        await prisma.interview.update({
          where: { id: existing.interviewId },
          data: {
            status: 'completed',
            ...(auditUser?.id && { updatedBy: auditUser.id })
          }
        });
      }

      // Candidate-safe outcome only — no score, notes, or internal decision labels.
      if (application) {
        await notifyCandidate({
          contact: {
            email: application.candidateEmail,
            phone: application.candidatePhone
          },
          email: evaluationOutcomeEmailTemplate({
            candidateName: application.candidateName,
            position: application.jobTitle || existing.jobTitle || 'the role',
            progressed: positive
          }),
          smsText: evaluationOutcomeSmsTemplate({
            candidateName: application.candidateName,
            position: application.jobTitle || existing.jobTitle || 'the role',
            progressed: positive
          })
        });
      }
    }

    const [withUsers] = await resolveAuthUsers([updated]);
    const [mapped] = await attachPreviousEvaluations([withUsers]);
    return {
      success: true,
      data: mapped,
      message: opts.submit ? 'Evaluation submitted' : 'Draft saved'
    };
  } catch (error: any) {
    console.error('updateEvaluationContent error:', error);
    return {
      success: false,
      error: {
        message:
          error.message ||
          (opts.submit
            ? 'Failed to submit evaluation'
            : 'Failed to save draft')
      }
    };
  }
}

export async function saveEvaluationDraft(
  id: string,
  payload: EvaluationPayload,
  user?: AuditUser
) {
  return updateEvaluationContent(id, payload, { submit: false, user });
}

export async function submitEvaluation(
  id: string,
  payload: EvaluationPayload,
  user?: AuditUser
) {
  return updateEvaluationContent(id, payload, { submit: true, user });
}
