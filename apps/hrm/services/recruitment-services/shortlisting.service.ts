'use server';

import { randomUUID } from 'crypto';
import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import {
  SHORTLISTING_STATUSES,
  type GetShortlistingParams,
  type ShortlistingRecord,
  type ShortlistingSummary
} from '@/types/recruitment';
import { mapApplicationRecord } from '@/lib/mappers/application.mapper';

function dayRange(ymd: string): { gte: Date; lt: Date } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  const gte = new Date(y, m, d, 0, 0, 0, 0);
  const lt = new Date(y, m, d + 1, 0, 0, 0, 0);
  return { gte, lt };
}

function experienceWhere(
  experience?: string
): Prisma.ApplicationWhereInput | null {
  if (!experience?.trim()) return null;
  switch (experience.trim()) {
    case '0-1':
      return { experienceYears: { gte: 0, lte: 1 } };
    case '1-3':
      return { experienceYears: { gt: 1, lte: 3 } };
    case '3-5':
      return { experienceYears: { gt: 3, lte: 5 } };
    case '5+':
      return { experienceYears: { gt: 5 } };
    default:
      return null;
  }
}

function buildShortlistingWhere(
  params: GetShortlistingParams
): Prisma.ApplicationWhereInput {
  const and: Prisma.ApplicationWhereInput[] = [
    { status: { notIn: ['withdrawn', 'hired'] } }
  ];

  if (params.jobPostId?.trim()) {
    and.push({ jobPostId: params.jobPostId.trim() });
  }
  if (params.department?.trim()) {
    and.push({
      departmentName: {
        equals: params.department.trim(),
        mode: Prisma.QueryMode.insensitive
      }
    });
  }
  if (params.designation?.trim()) {
    and.push({
      OR: [
        {
          designationName: {
            equals: params.designation.trim(),
            mode: Prisma.QueryMode.insensitive
          }
        },
        { designationId: params.designation.trim() }
      ]
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
  if (params.status?.trim()) {
    and.push({ shortlistStatus: params.status.trim() });
  }
  if (params.applicationDate?.trim()) {
    const range = dayRange(params.applicationDate);
    if (range) {
      and.push({ appliedDate: { gte: range.gte, lt: range.lt } });
    }
  }
  const exp = experienceWhere(params.experience);
  if (exp) and.push(exp);

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
          designationName: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          qualifications: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        { skills: { has: search } },
        {
          shortlistStatus: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          currentStage: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        }
      ]
    });
  }

  return { AND: and };
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

export async function getShortlisting(
  params: GetShortlistingParams
): Promise<{
  success: boolean;
  data?: { records: ShortlistingRecord[]; totalRecords: number };
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
    const where = buildShortlistingWhere(params);

    const [rows, totalRecords] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ screeningScore: 'desc' }, { createdAt: 'desc' }]
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
      message: 'Shortlisting fetched successfully'
    };
  } catch (error: any) {
    console.error('getShortlisting error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch shortlisting' }
    };
  }
}

export async function getShortlistingForExport(
  params: Omit<GetShortlistingParams, 'page' | 'limit'>
): Promise<{
  success: boolean;
  data?: ShortlistingRecord[];
  totalRecords?: number;
  error?: { message?: string };
}> {
  try {
    const where = buildShortlistingWhere(params);
    const rows = await prisma.application.findMany({
      where,
      orderBy: [{ screeningScore: 'desc' }, { createdAt: 'desc' }]
    });
    const withUsers = await resolveAuthUsers(rows);
    const records = withUsers.map(mapApplicationRecord);
    return { success: true, data: records, totalRecords: records.length };
  } catch (error: any) {
    console.error('getShortlistingForExport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export shortlisting' }
    };
  }
}

export async function getShortlistingSummary(): Promise<{
  success: boolean;
  data?: ShortlistingSummary;
  error?: { message?: string };
}> {
  try {
    const base: Prisma.ApplicationWhereInput = {
      status: { notIn: ['withdrawn', 'hired'] }
    };

    const [counts, scoreAgg] = await Promise.all([
      Promise.all(
        SHORTLISTING_STATUSES.map((status) =>
          prisma.application.count({
            where: { ...base, shortlistStatus: status }
          })
        )
      ),
      prisma.application.aggregate({
        where: base,
        _avg: { screeningScore: true }
      })
    ]);

    const byStatus = Object.fromEntries(
      SHORTLISTING_STATUSES.map((status, i) => [status, counts[i] ?? 0])
    ) as Record<(typeof SHORTLISTING_STATUSES)[number], number>;

    return {
      success: true,
      data: {
        toReview: byStatus.to_review,
        shortlisted: byStatus.shortlisted,
        onHold: byStatus.on_hold,
        avgScreeningScore: Math.round(scoreAgg._avg.screeningScore ?? 0)
      }
    };
  } catch (error: any) {
    console.error('getShortlistingSummary error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch shortlisting summary' }
    };
  }
}

const holdSchema = z.object({
  reason: z.string().trim().max(1000).optional().default('')
});

export async function holdApplication(
  id: string,
  reason?: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ShortlistingRecord;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid application ID' } };
    }

    const parsed = holdSchema.safeParse({ reason: reason ?? '' });
    if (!parsed.success) {
      return {
        success: false,
        error: { message: 'Invalid hold reason' }
      };
    }

    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'Application not found' } };
    }
    if (existing.status !== 'active') {
      return {
        success: false,
        error: { message: 'Only active applications can be placed on hold' }
      };
    }
    if (
      existing.shortlistStatus !== 'to_review' &&
      existing.shortlistStatus !== 'shortlisted'
    ) {
      return {
        success: false,
        error: {
          message: 'Application cannot be held from the current shortlist status'
        }
      };
    }

    const auditUser = toAuditUser(user);
    const holdReason = parsed.data.reason || null;
    const updated = await prisma.application.update({
      where: { id },
      data: {
        shortlistStatus: 'on_hold',
        holdReason,
        history: [
          ...(existing.history ?? []),
          historyEntry(
            'On hold',
            holdReason || 'Candidate placed on hold',
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
      message: 'Application placed on hold'
    };
  } catch (error: any) {
    console.error('holdApplication error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to place application on hold' }
    };
  }
}

const scoreSchema = z.object({
  screeningScore: z.coerce.number().int().min(0).max(100)
});

export async function updateScreeningScore(
  id: string,
  screeningScore: number,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ShortlistingRecord;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid application ID' } };
    }

    const parsed = scoreSchema.safeParse({ screeningScore });
    if (!parsed.success) {
      return {
        success: false,
        error: { message: 'Screening score must be a whole number from 0 to 100' }
      };
    }

    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'Application not found' } };
    }
    if (existing.status !== 'active') {
      return {
        success: false,
        error: { message: 'Only active applications can be scored' }
      };
    }

    const auditUser = toAuditUser(user);
    const score = parsed.data.screeningScore;
    const updated = await prisma.application.update({
      where: { id },
      data: {
        screeningScore: score,
        history: [
          ...(existing.history ?? []),
          historyEntry(
            'Screening score updated',
            `Score set to ${score}`,
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
      message: 'Screening score updated'
    };
  } catch (error: any) {
    console.error('updateScreeningScore error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update screening score' }
    };
  }
}
