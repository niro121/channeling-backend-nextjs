'use server';

import { randomUUID } from 'crypto';
import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import { MOBILE_NUMBER_REGEX } from '@/lib/validations/phone-mobile';
import {
  APPLICATION_CODE_PREFIX,
  APPLICATION_SOURCES,
  APPLICATION_STAGES,
  type ApplicationHistoryEntry,
  type ApplicationPayload,
  type ApplicationRecord,
  type ApplicationSource,
  type ApplicationStage,
  type ApplicationStatus,
  type ApplicationSummary,
  type GetApplicationsParams,
  type ShortlistingStatus
} from '@/types/recruitment';

const MOBILE_VALIDATION_MESSAGE = 'Mobile Number Ex: 07x xxxxxxx';

const sourceSchema = z.enum(APPLICATION_SOURCES);

const applicationPayloadSchema = z.object({
  candidateName: z.string().trim().min(1, 'Candidate name is required').max(200),
  candidateEmail: z
    .string()
    .trim()
    .email('Enter a valid email')
    .max(200),
  candidatePhone: z
    .string()
    .trim()
    .optional()
    .default('')
    .refine(
      (v) => v === '' || MOBILE_NUMBER_REGEX.test(v),
      MOBILE_VALIDATION_MESSAGE
    ),
  experienceYears: z.coerce
    .number()
    .int('Enter a whole number of years')
    .min(0, 'Experience cannot be negative')
    .max(60, 'Experience looks too high')
    .optional()
    .default(0),
  qualifications: z.string().trim().optional().default(''),
  skills: z.array(z.string().trim()).optional().default([]),
  screeningScore: z.coerce
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .default(0),
  jobPostId: z.string().min(1, 'Job post is required'),
  source: sourceSchema,
  notes: z.string().trim().optional().default(''),
  resumeFileName: z.string().trim().optional().default(''),
  resumeFileKey: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((value) => (value == null || value === '' ? null : value)),
  resumeBankProfileId: z.string().trim().nullable().optional().default(null)
});

function toIso(date?: Date | null): string {
  if (!date) return '';
  return date.toISOString();
}

function dayRange(ymd: string): { gte: Date; lt: Date } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  const gte = new Date(y, m, d, 0, 0, 0, 0);
  const lt = new Date(y, m, d + 1, 0, 0, 0, 0);
  if (Number.isNaN(gte.getTime())) return null;
  return { gte, lt };
}

function mapHistory(
  entries: {
    id: string;
    title: string;
    detail: string;
    userLabel: string;
    at: Date;
  }[]
): ApplicationHistoryEntry[] {
  return (entries ?? []).map((entry) => ({
    id: entry.id,
    title: entry.title,
    detail: entry.detail,
    userLabel: entry.userLabel,
    at: toIso(entry.at)
  }));
}

export function mapApplicationRecord(
  record: {
    id: string;
    applicationId: string;
    candidateName: string;
    candidateEmail: string;
    candidatePhone: string;
    jobPostId: string;
    jobPostCode: string;
    jobTitle: string;
    departmentName: string;
    designationId?: string | null;
    designationName?: string;
    appliedDate: Date;
    experienceYears: number;
    qualifications?: string;
    skills?: string[];
    source: string;
    currentStage: string;
    status: string;
    shortlistStatus?: string;
    screeningScore?: number;
    resumeFileName: string;
    resumeFileKey: string | null;
    resumeBankProfileId: string | null;
    notes: string;
    rejectReason: string | null;
    holdReason?: string | null;
    history: {
      id: string;
      title: string;
      detail: string;
      userLabel: string;
      at: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
    createdUser?: { name: string } | null;
    updatedUser?: { name: string } | null;
  }
): ApplicationRecord {
  return {
    id: record.id,
    applicationId: record.applicationId,
    candidateName: record.candidateName,
    candidateEmail: record.candidateEmail,
    candidatePhone: record.candidatePhone,
    jobPostId: record.jobPostId,
    jobPostCode: record.jobPostCode,
    jobTitle: record.jobTitle,
    department: record.departmentName,
    designation: record.designationName ?? '',
    designationId: record.designationId ?? null,
    appliedDate: toIso(record.appliedDate),
    experienceYears: record.experienceYears,
    qualifications: record.qualifications ?? '',
    skills: record.skills ?? [],
    source: record.source as ApplicationSource,
    currentStage: record.currentStage as ApplicationStage,
    status: record.status as ApplicationStatus,
    shortlistStatus: (record.shortlistStatus ??
      'to_review') as ShortlistingStatus,
    screeningScore: record.screeningScore ?? 0,
    resumeFileName: record.resumeFileName,
    resumeFileKey: record.resumeFileKey,
    resumeBankProfileId: record.resumeBankProfileId,
    notes: record.notes,
    rejectReason: record.rejectReason ?? undefined,
    holdReason: record.holdReason ?? undefined,
    history: mapHistory(record.history ?? []),
    createdAt: toIso(record.createdAt),
    createdBy: record.createdUser?.name ?? '',
    updatedAt: toIso(record.updatedAt),
    updatedBy: record.updatedUser?.name ?? ''
  };
}

function buildApplicationWhere(
  params: GetApplicationsParams
): Prisma.ApplicationWhereInput {
  const and: Prisma.ApplicationWhereInput[] = [];
  const where: Prisma.ApplicationWhereInput = {};

  if (params.jobPostId?.trim()) {
    and.push({ jobPostId: params.jobPostId.trim() });
  }
  if (params.jobTitle?.trim()) {
    and.push({
      jobTitle: {
        contains: params.jobTitle.trim(),
        mode: Prisma.QueryMode.insensitive
      }
    });
  }
  if (params.candidateName?.trim()) {
    and.push({
      candidateName: {
        contains: params.candidateName.trim(),
        mode: Prisma.QueryMode.insensitive
      }
    });
  }
  if (params.applicationId?.trim()) {
    and.push({
      applicationId: {
        contains: params.applicationId.trim(),
        mode: Prisma.QueryMode.insensitive
      }
    });
  }
  if (params.department?.trim()) {
    and.push({
      departmentName: {
        contains: params.department.trim(),
        mode: Prisma.QueryMode.insensitive
      }
    });
  }
  if (params.status?.trim()) {
    and.push({ status: params.status.trim() });
  }
  if (params.source?.trim()) {
    and.push({ source: params.source.trim() });
  }
  if (params.applicationDate?.trim()) {
    const range = dayRange(params.applicationDate);
    if (range) {
      and.push({ appliedDate: { gte: range.gte, lt: range.lt } });
    }
  }

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        {
          applicationId: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          candidateName: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          candidateEmail: {
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
          jobPostCode: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          departmentName: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          currentStage: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        { status: { contains: search, mode: Prisma.QueryMode.insensitive } }
      ]
    });
  }

  if (and.length) where.AND = and;
  return where;
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

export async function getApplications(params: GetApplicationsParams): Promise<{
  success: boolean;
  data?: { records: ApplicationRecord[]; totalRecords: number };
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
      Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100;
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
    const where = buildApplicationWhere(params);

    const [rows, totalRecords] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.application.count({ where })
    ]);

    const withUsers = await resolveAuthUsers(rows);
    return {
      success: true,
      data: {
        records: withUsers.map(mapApplicationRecord),
        totalRecords
      },
      message: 'Applications fetched successfully'
    };
  } catch (error: any) {
    console.error('getApplications error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch applications' }
    };
  }
}

export async function getApplicationsForExport(
  params: Omit<GetApplicationsParams, 'page' | 'limit'>
): Promise<{
  success: boolean;
  data?: ApplicationRecord[];
  totalRecords?: number;
  error?: { message?: string };
}> {
  try {
    const where = buildApplicationWhere(params);
    const rows = await prisma.application.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    const withUsers = await resolveAuthUsers(rows);
    const records = withUsers.map(mapApplicationRecord);
    return { success: true, data: records, totalRecords: records.length };
  } catch (error: any) {
    console.error('getApplicationsForExport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export applications' }
    };
  }
}

export async function getApplicationSummary(): Promise<{
  success: boolean;
  data?: ApplicationSummary;
  error?: { message?: string };
}> {
  try {
    const counts = await Promise.all(
      APPLICATION_STAGES.map((stage) =>
        prisma.application.count({ where: { currentStage: stage } })
      )
    );

    const data: ApplicationSummary = {
      applied: 0,
      screening: 0,
      shortlisted: 0,
      interview: 0,
      selected: 0,
      offer: 0,
      hired: 0,
      rejected: 0
    };
    APPLICATION_STAGES.forEach((stage, index) => {
      data[stage] = counts[index] ?? 0;
    });

    return { success: true, data };
  } catch (error: any) {
    console.error('getApplicationSummary error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch application summary' }
    };
  }
}

export async function getApplicationById(id: string): Promise<{
  success: boolean;
  data?: ApplicationRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid application ID' } };
    }
    const row = await prisma.application.findUnique({ where: { id } });
    if (!row) {
      return { success: false, error: { message: 'Application not found' } };
    }
    const [withUsers] = await resolveAuthUsers([row]);
    return { success: true, data: mapApplicationRecord(withUsers) };
  } catch (error: any) {
    console.error('getApplicationById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch application' }
    };
  }
}

export async function getJobPostSelectOptions(params?: {
  publishedOnly?: boolean;
}): Promise<{
  success: boolean;
  data?: { id: string; name: string }[];
  error?: { message?: string };
}> {
  try {
    const rows = await prisma.jobPost.findMany({
      where: params?.publishedOnly ? { status: 'published' } : undefined,
      orderBy: { jobPostId: 'asc' },
      select: { id: true, jobPostId: true, jobTitle: true }
    });
    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        name: `${row.jobPostId} — ${row.jobTitle}`
      }))
    };
  } catch (error: any) {
    console.error('getJobPostSelectOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load job posts' }
    };
  }
}

export async function createApplication(
  payload: ApplicationPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ApplicationRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = applicationPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const data = parsed.data;
    const auditUser = toAuditUser(user);
    const jobPost = await prisma.jobPost.findUnique({
      where: { id: data.jobPostId }
    });
    if (!jobPost) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: { jobPostId: ['Selected job post was not found'] }
        }
      };
    }

    const email = data.candidateEmail.toLowerCase();
    const duplicate = await prisma.application.findFirst({
      where: {
        jobPostId: data.jobPostId,
        candidateEmail: {
          equals: email,
          mode: Prisma.QueryMode.insensitive
        }
      },
      select: { id: true, applicationId: true }
    });
    if (duplicate) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: {
            candidateEmail: [
              `An application already exists for this email on ${jobPost.jobPostId}`
            ]
          }
        }
      };
    }

    let qualifications = data.qualifications;
    let skills = data.skills;

    if (data.resumeBankProfileId) {
      const profile = await prisma.resumeBankProfile.findUnique({
        where: { id: data.resumeBankProfileId },
        select: {
          id: true,
          qualifications: true,
          skills: true
        }
      });
      if (!profile) {
        return {
          success: false,
          error: {
            message: 'Validation failed',
            issues: {
              resumeBankProfileId: ['Resume bank profile was not found']
            }
          }
        };
      }
      if (!qualifications) qualifications = profile.qualifications ?? '';
      if (!skills.length) skills = profile.skills ?? [];
    }

    const generated = await generateRecordCode(APPLICATION_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: {
          message: 'Failed to generate application code. Please try again.'
        }
      };
    }

    const actor = actorLabel(auditUser);
    const created = await prisma.application.create({
      data: {
        applicationId: generated.code,
        candidateName: data.candidateName,
        candidateEmail: email,
        candidatePhone: data.candidatePhone,
        experienceYears: data.experienceYears,
        qualifications,
        skills,
        jobPostId: jobPost.id,
        jobPostCode: jobPost.jobPostId,
        jobTitle: jobPost.jobTitle,
        departmentName: jobPost.departmentName,
        departmentId: jobPost.departmentId,
        designationId: jobPost.designationId,
        designationName: jobPost.designationName,
        source: data.source,
        currentStage: 'applied',
        status: 'active',
        shortlistStatus: 'to_review',
        screeningScore: data.screeningScore,
        appliedDate: new Date(),
        notes: data.notes,
        resumeFileName: data.resumeFileName,
        resumeFileKey: data.resumeFileKey,
        resumeBankProfileId: data.resumeBankProfileId,
        history: [
          historyEntry(
            'Application received',
            `Submitted via ${data.source.replace(/_/g, ' ')}`,
            actor
          )
        ],
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      }
    });

    await prisma.jobPost.update({
      where: { id: jobPost.id },
      data: { applicationsCount: { increment: 1 } }
    });

    if (data.resumeBankProfileId) {
      const profile = await prisma.resumeBankProfile.findUnique({
        where: { id: data.resumeBankProfileId }
      });
      if (profile) {
        const linkedIds = [
          ...new Set([...(profile.linkedApplicationIds ?? []), created.id])
        ];
        await prisma.resumeBankProfile.update({
          where: { id: profile.id },
          data: {
            linkedApplicationIds: linkedIds,
            status:
              profile.status === 'shortlisted' ? 'shortlisted' : 'linked',
            ...(auditUser?.id && { updatedBy: auditUser.id })
          }
        });
      }
    }

    const [withUsers] = await resolveAuthUsers([created]);
    return {
      success: true,
      data: mapApplicationRecord(withUsers),
      message: 'Application created successfully'
    };
  } catch (error: any) {
    console.error('createApplication error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Duplicate application',
          issues: {
            candidateEmail: [
              'An application already exists for this email on this job post'
            ]
          }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create application' }
    };
  }
}

export async function shortlistApplication(
  id: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ApplicationRecord;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid application ID' } };
    }
    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'Application not found' } };
    }
    if (existing.status !== 'active') {
      return {
        success: false,
        error: { message: 'Only active applications can be shortlisted' }
      };
    }
    const eligibleByStage =
      existing.currentStage === 'applied' ||
      existing.currentStage === 'screening';
    const eligibleByLane = existing.shortlistStatus === 'to_review';
    if (!eligibleByStage && !eligibleByLane) {
      return {
        success: false,
        error: {
          message: 'Application is not eligible for shortlisting from this stage'
        }
      };
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.application.update({
      where: { id },
      data: {
        currentStage: 'shortlisted',
        shortlistStatus: 'shortlisted',
        holdReason: null,
        history: [
          ...(existing.history ?? []),
          historyEntry(
            'Stage: Shortlisted',
            'Added to shortlist',
            actorLabel(auditUser)
          )
        ],
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    if (updated.resumeBankProfileId) {
      await prisma.resumeBankProfile.updateMany({
        where: { id: updated.resumeBankProfileId },
        data: {
          status: 'shortlisted',
          ...(auditUser?.id && { updatedBy: auditUser.id })
        }
      });
    }

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapApplicationRecord(withUsers),
      message: 'Application shortlisted'
    };
  } catch (error: any) {
    console.error('shortlistApplication error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to shortlist application' }
    };
  }
}

export async function rejectApplication(
  id: string,
  reason?: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ApplicationRecord;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid application ID' } };
    }
    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'Application not found' } };
    }
    if (existing.status !== 'active') {
      return {
        success: false,
        error: { message: 'Only active applications can be rejected' }
      };
    }
    if (
      existing.currentStage === 'hired' ||
      existing.currentStage === 'rejected'
    ) {
      return {
        success: false,
        error: { message: 'Application cannot be rejected from this stage' }
      };
    }

    const auditUser = toAuditUser(user);
    const rejectReason = reason?.trim() || '';
    const updated = await prisma.application.update({
      where: { id },
      data: {
        currentStage: 'rejected',
        status: 'rejected',
        shortlistStatus: 'rejected',
        rejectReason: rejectReason || null,
        holdReason: null,
        history: [
          ...(existing.history ?? []),
          historyEntry(
            'Rejected',
            rejectReason || 'Application rejected',
            actorLabel(auditUser)
          )
        ],
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapApplicationRecord(withUsers),
      message: 'Application rejected'
    };
  } catch (error: any) {
    console.error('rejectApplication error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to reject application' }
    };
  }
}
