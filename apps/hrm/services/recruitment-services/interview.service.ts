'use server';

import { randomUUID } from 'crypto';
import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import { mapInterviewRecord } from '@/lib/mappers/interview.mapper';
import {
  INTERVIEW_CODE_PREFIX,
  INTERVIEW_TYPES,
  type GetInterviewsParams,
  type InterviewPayload,
  type InterviewRecord,
  type InterviewSummary,
  type RescheduleInterviewPayload
} from '@/types/recruitment';

const interviewTypeSchema = z.enum(INTERVIEW_TYPES);
const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter time as HH:mm');

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

function weekRangeFromMonday(ymd: string): { gte: Date; lt: Date } | null {
  const start = parseInterviewDate(ymd);
  if (!start) return null;
  const lt = new Date(start);
  lt.setDate(start.getDate() + 5);
  return { gte: start, lt };
}

function currentWeekMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
}

const interviewPayloadSchema = z.object({
  applicationId: z.string().min(1, 'Application is required'),
  interviewType: interviewTypeSchema,
  interviewDate: z.union([z.date(), z.string().min(1)]),
  startTime: timeSchema,
  endTime: timeSchema,
  interviewerPanel: z
    .string()
    .trim()
    .min(1, 'Interviewer / panel is required')
    .max(500),
  location: z.string().trim().optional().default(''),
  notesToCandidate: z.string().trim().optional().default('')
});

const reschedulePayloadSchema = interviewPayloadSchema.omit({
  applicationId: true
});

function buildInterviewWhere(
  params: GetInterviewsParams
): Prisma.InterviewWhereInput {
  const and: Prisma.InterviewWhereInput[] = [];

  if (params.interviewDate?.trim()) {
    const range = dayRange(params.interviewDate);
    if (range) and.push({ interviewDate: { gte: range.gte, lt: range.lt } });
  } else if (params.weekStart?.trim()) {
    const range = weekRangeFromMonday(params.weekStart);
    if (range) and.push({ interviewDate: { gte: range.gte, lt: range.lt } });
  }

  if (params.interviewer?.trim()) {
    and.push({
      interviewerPanel: {
        contains: params.interviewer.trim(),
        mode: Prisma.QueryMode.insensitive
      }
    });
  }
  if (params.department?.trim()) {
    and.push({
      departmentName: {
        equals: params.department.trim(),
        mode: Prisma.QueryMode.insensitive
      }
    });
  }
  if (params.jobPostId?.trim()) {
    and.push({ jobPostId: params.jobPostId.trim() });
  }
  if (params.interviewType?.trim()) {
    and.push({ interviewType: params.interviewType.trim() });
  }
  if (params.status?.trim()) {
    and.push({ status: params.status.trim() });
  }

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        {
          interviewCode: {
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
          applicationCode: {
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
          interviewerPanel: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          location: {
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

export async function getInterviews(params: GetInterviewsParams): Promise<{
  success: boolean;
  data?: { records: InterviewRecord[]; totalRecords: number };
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
    const where = buildInterviewWhere(params);

    const [rows, totalRecords] = await Promise.all([
      prisma.interview.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ interviewDate: 'asc' }, { startTime: 'asc' }]
      }),
      prisma.interview.count({ where })
    ]);

    const withUsers = await resolveAuthUsers(rows);
    return {
      success: true,
      data: {
        records: withUsers.map(mapInterviewRecord),
        totalRecords
      },
      message: 'Interviews fetched successfully'
    };
  } catch (error: any) {
    console.error('getInterviews error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch interviews' }
    };
  }
}

export async function getInterviewsForExport(
  params: Omit<GetInterviewsParams, 'page' | 'limit'>
): Promise<{
  success: boolean;
  data?: InterviewRecord[];
  totalRecords?: number;
  error?: { message?: string };
}> {
  try {
    const where = buildInterviewWhere(params);
    const rows = await prisma.interview.findMany({
      where,
      orderBy: [{ interviewDate: 'asc' }, { startTime: 'asc' }]
    });
    const withUsers = await resolveAuthUsers(rows);
    const records = withUsers.map(mapInterviewRecord);
    return { success: true, data: records, totalRecords: records.length };
  } catch (error: any) {
    console.error('getInterviewsForExport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export interviews' }
    };
  }
}

export async function getInterviewSummary(): Promise<{
  success: boolean;
  data?: InterviewSummary;
  error?: { message?: string };
}> {
  try {
    const monday = currentWeekMonday();
    const weekEnd = new Date(monday);
    weekEnd.setDate(monday.getDate() + 5);

    const [thisWeek, confirmed, rescheduled, noShow] = await Promise.all([
      prisma.interview.count({
        where: {
          interviewDate: { gte: monday, lt: weekEnd },
          status: { not: 'cancelled' }
        }
      }),
      prisma.interview.count({ where: { status: 'confirmed' } }),
      prisma.interview.count({ where: { status: 'rescheduled' } }),
      prisma.interview.count({ where: { status: 'no_show' } })
    ]);

    return {
      success: true,
      data: { thisWeek, confirmed, rescheduled, noShow }
    };
  } catch (error: any) {
    console.error('getInterviewSummary error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch interview summary' }
    };
  }
}

export async function getInterviewById(id: string): Promise<{
  success: boolean;
  data?: InterviewRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid interview ID' } };
    }
    const row = await prisma.interview.findUnique({ where: { id } });
    if (!row) {
      return { success: false, error: { message: 'Interview not found' } };
    }
    const [withUsers] = await resolveAuthUsers([row]);
    return { success: true, data: mapInterviewRecord(withUsers) };
  } catch (error: any) {
    console.error('getInterviewById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch interview' }
    };
  }
}

/** Applications eligible to schedule an interview. */
export async function getInterviewableApplicationOptions(): Promise<{
  success: boolean;
  data?: { id: string; name: string; jobPostId: string; candidateName: string }[];
  error?: { message?: string };
}> {
  try {
    const rows = await prisma.application.findMany({
      where: {
        status: 'active',
        currentStage: { in: ['shortlisted', 'interview', 'screening'] }
      },
      select: {
        id: true,
        applicationId: true,
        candidateName: true,
        jobPostId: true,
        jobPostCode: true,
        jobTitle: true
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        name: `${row.applicationId} — ${row.candidateName} (${row.jobPostCode || row.jobTitle})`,
        jobPostId: row.jobPostId,
        candidateName: row.candidateName
      }))
    };
  } catch (error: any) {
    console.error('getInterviewableApplicationOptions error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to load application options'
      }
    };
  }
}

export async function createInterview(
  payload: InterviewPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: InterviewRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = interviewPayloadSchema.safeParse(payload);
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
    const interviewDate = parseInterviewDate(data.interviewDate);
    if (!interviewDate) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: { interviewDate: ['Enter a valid interview date'] }
        }
      };
    }
    if (data.endTime <= data.startTime) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: { endTime: ['End time must be after start time'] }
        }
      };
    }

    const application = await prisma.application.findUnique({
      where: { id: data.applicationId }
    });
    if (!application) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: { applicationId: ['Application was not found'] }
        }
      };
    }
    if (application.status !== 'active') {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: {
            applicationId: ['Only active applications can be scheduled']
          }
        }
      };
    }

    const generated = await generateRecordCode(INTERVIEW_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: {
          message: 'Failed to generate interview code. Please try again.'
        }
      };
    }

    const auditUser = toAuditUser(user);
    const actor = actorLabel(auditUser);

    const created = await prisma.interview.create({
      data: {
        interviewCode: generated.code,
        applicationId: application.id,
        applicationCode: application.applicationId,
        candidateName: application.candidateName,
        jobPostId: application.jobPostId,
        jobPostCode: application.jobPostCode,
        jobTitle: application.jobTitle,
        departmentName: application.departmentName,
        interviewDate,
        startTime: data.startTime,
        endTime: data.endTime,
        interviewerPanel: data.interviewerPanel,
        interviewType: data.interviewType,
        location: data.location,
        notesToCandidate: data.notesToCandidate,
        status: 'scheduled',
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      }
    });

    await prisma.application.update({
      where: { id: application.id },
      data: {
        currentStage: 'interview',
        history: [
          ...(application.history ?? []),
          historyEntry(
            'Stage: Interview',
            `Interview ${generated.code} scheduled`,
            actor
          )
        ],
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    const [withUsers] = await resolveAuthUsers([created]);
    return {
      success: true,
      data: mapInterviewRecord(withUsers),
      message: 'Interview scheduled'
    };
  } catch (error: any) {
    console.error('createInterview error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to schedule interview' }
    };
  }
}

export async function rescheduleInterview(
  id: string,
  payload: RescheduleInterviewPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: InterviewRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid interview ID' } };
    }

    const parsed = reschedulePayloadSchema.safeParse(payload);
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
    const interviewDate = parseInterviewDate(data.interviewDate);
    if (!interviewDate) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: { interviewDate: ['Enter a valid interview date'] }
        }
      };
    }
    if (data.endTime <= data.startTime) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: { endTime: ['End time must be after start time'] }
        }
      };
    }

    const existing = await prisma.interview.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'Interview not found' } };
    }
    if (
      existing.status !== 'scheduled' &&
      existing.status !== 'confirmed' &&
      existing.status !== 'rescheduled'
    ) {
      return {
        success: false,
        error: { message: 'Interview cannot be rescheduled from this status' }
      };
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.interview.update({
      where: { id },
      data: {
        interviewDate,
        startTime: data.startTime,
        endTime: data.endTime,
        interviewerPanel: data.interviewerPanel,
        interviewType: data.interviewType,
        location: data.location,
        notesToCandidate: data.notesToCandidate,
        status: 'rescheduled',
        cancelReason: null,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    const application = await prisma.application.findUnique({
      where: { id: existing.applicationId }
    });
    if (application) {
      await prisma.application.update({
        where: { id: application.id },
        data: {
          history: [
            ...(application.history ?? []),
            historyEntry(
              'Interview rescheduled',
              `${existing.interviewCode} moved to new slot`,
              actorLabel(auditUser)
            )
          ],
          ...(auditUser?.id && { updatedBy: auditUser.id })
        }
      });
    }

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapInterviewRecord(withUsers),
      message: 'Interview rescheduled'
    };
  } catch (error: any) {
    console.error('rescheduleInterview error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to reschedule interview' }
    };
  }
}

export async function cancelInterview(
  id: string,
  reason?: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: InterviewRecord;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid interview ID' } };
    }

    const existing = await prisma.interview.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'Interview not found' } };
    }
    if (
      existing.status !== 'scheduled' &&
      existing.status !== 'confirmed' &&
      existing.status !== 'rescheduled'
    ) {
      return {
        success: false,
        error: { message: 'Interview cannot be cancelled from this status' }
      };
    }

    const auditUser = toAuditUser(user);
    const cancelReason = reason?.trim() || '';
    const updated = await prisma.interview.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelReason: cancelReason || null,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    const application = await prisma.application.findUnique({
      where: { id: existing.applicationId }
    });
    if (application) {
      await prisma.application.update({
        where: { id: application.id },
        data: {
          history: [
            ...(application.history ?? []),
            historyEntry(
              'Interview cancelled',
              cancelReason || `${existing.interviewCode} cancelled`,
              actorLabel(auditUser)
            )
          ],
          ...(auditUser?.id && { updatedBy: auditUser.id })
        }
      });
    }

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapInterviewRecord(withUsers),
      message: 'Interview cancelled'
    };
  } catch (error: any) {
    console.error('cancelInterview error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to cancel interview' }
    };
  }
}

export async function confirmInterview(
  id: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: InterviewRecord;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid interview ID' } };
    }
    const existing = await prisma.interview.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'Interview not found' } };
    }
    if (
      existing.status !== 'scheduled' &&
      existing.status !== 'rescheduled'
    ) {
      return {
        success: false,
        error: { message: 'Interview cannot be confirmed from this status' }
      };
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.interview.update({
      where: { id },
      data: {
        status: 'confirmed',
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapInterviewRecord(withUsers),
      message: 'Interview confirmed'
    };
  } catch (error: any) {
    console.error('confirmInterview error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to confirm interview' }
    };
  }
}
