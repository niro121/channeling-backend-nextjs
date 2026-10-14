'use server';

import { randomUUID } from 'crypto';
import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import { sendEmail } from '@/lib/helpers/email';
import { sendSms } from '@/lib/helpers/sms';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import { mapAppointmentLetterRecord } from '@/lib/mappers/appointment-letter.mapper';
import { appointmentLetterEmailTemplate } from '@/lib/templates/email/appointment-letter';
import { appointmentLetterSmsTemplate } from '@/lib/templates/sms/appointment-letter';
import {
  APPOINTMENT_LETTER_CODE_PREFIX,
  APPOINTMENT_LETTER_STATUSES,
  VACANCY_EMPLOYMENT_TYPES,
  type AppointmentLetterPayload,
  type AppointmentLetterRecord,
  type AppointmentLetterSummary,
  type AppointmentLetterUpdatePayload,
  type GetAppointmentLettersParams,
  type VacancySelectOption
} from '@/types/recruitment';

const employmentTypeSchema = z.enum(VACANCY_EMPLOYMENT_TYPES);
const statusSchema = z.enum(APPOINTMENT_LETTER_STATUSES);

function parseDay(value: Date | string): Date | null {
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

const letterFieldsSchema = z.object({
  position: z.string().trim().optional().default(''),
  department: z.string().trim().optional().default(''),
  employmentType: employmentTypeSchema,
  salary: z.string().trim().min(1, 'Salary is required').max(200),
  appointmentDate: z.union([z.date(), z.string().min(1)]),
  letterDate: z.union([z.date(), z.string().min(1)]),
  reportingLocation: z.string().trim().optional().default(''),
  reportingManager: z.string().trim().optional().default(''),
  probationPeriod: z.string().trim().optional().default(''),
  benefits: z.string().trim().optional().default(''),
  termsAndConditions: z.string().trim().optional().default('')
});

const createPayloadSchema = letterFieldsSchema.extend({
  evaluationId: z.string().min(1, 'Evaluation is required')
});

function buildWhere(
  params: GetAppointmentLettersParams
): Prisma.AppointmentLetterWhereInput {
  const and: Prisma.AppointmentLetterWhereInput[] = [];

  if (params.evaluationId?.trim()) {
    and.push({ evaluationId: params.evaluationId.trim() });
  }
  if (params.letterNumber?.trim()) {
    and.push({
      letterNumber: {
        contains: params.letterNumber.trim(),
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
  if (params.position?.trim()) {
    and.push({
      position: {
        contains: params.position.trim(),
        mode: Prisma.QueryMode.insensitive
      }
    });
  }
  if (params.department?.trim()) {
    and.push({
      department: {
        equals: params.department.trim(),
        mode: Prisma.QueryMode.insensitive
      }
    });
  }
  if (params.letterDate?.trim()) {
    const range = dayRange(params.letterDate);
    if (range) and.push({ letterDate: { gte: range.gte, lt: range.lt } });
  }
  if (params.status?.trim()) {
    const parsed = statusSchema.safeParse(params.status.trim());
    if (parsed.success) and.push({ status: parsed.data });
  }

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        {
          letterNumber: {
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
          position: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          department: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          salary: {
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

function toYmdLabel(date?: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getAppointmentLetters(
  params: GetAppointmentLettersParams
): Promise<{
  success: boolean;
  data?: { records: AppointmentLetterRecord[]; totalRecords: number };
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
    const where = buildWhere(params);

    const [rows, totalRecords] = await Promise.all([
      prisma.appointmentLetter.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ updatedAt: 'desc' }]
      }),
      prisma.appointmentLetter.count({ where })
    ]);

    const withUsers = await resolveAuthUsers(rows);
    return {
      success: true,
      data: {
        records: withUsers.map(mapAppointmentLetterRecord),
        totalRecords
      }
    };
  } catch (error: any) {
    console.error('getAppointmentLetters error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch appointment letters' }
    };
  }
}

export async function getAppointmentLettersForExport(
  params: Omit<GetAppointmentLettersParams, 'page' | 'limit'>
): Promise<{
  success: boolean;
  data?: AppointmentLetterRecord[];
  totalRecords?: number;
  error?: { message?: string };
}> {
  try {
    const where = buildWhere(params);
    const rows = await prisma.appointmentLetter.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }]
    });
    const withUsers = await resolveAuthUsers(rows);
    const records = withUsers.map(mapAppointmentLetterRecord);
    return { success: true, data: records, totalRecords: records.length };
  } catch (error: any) {
    console.error('getAppointmentLettersForExport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export appointment letters' }
    };
  }
}

export async function getAppointmentLetterSummary(): Promise<{
  success: boolean;
  data?: AppointmentLetterSummary;
  error?: { message?: string };
}> {
  try {
    const [offersExtended, pendingApproval, accepted, declined] =
      await Promise.all([
        prisma.appointmentLetter.count({
          where: { status: { not: 'declined' } }
        }),
        prisma.appointmentLetter.count({
          where: { status: 'pending_approval' }
        }),
        prisma.appointmentLetter.count({ where: { status: 'accepted' } }),
        prisma.appointmentLetter.count({ where: { status: 'declined' } })
      ]);
    return {
      success: true,
      data: { offersExtended, pendingApproval, accepted, declined }
    };
  } catch (error: any) {
    console.error('getAppointmentLetterSummary error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch summary' }
    };
  }
}

export async function getAppointmentLetterById(id: string): Promise<{
  success: boolean;
  data?: AppointmentLetterRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid letter ID' } };
    }
    const row = await prisma.appointmentLetter.findUnique({ where: { id } });
    if (!row) {
      return { success: false, error: { message: 'Appointment letter not found' } };
    }
    const [withUsers] = await resolveAuthUsers([row]);
    return { success: true, data: mapAppointmentLetterRecord(withUsers) };
  } catch (error: any) {
    console.error('getAppointmentLetterById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch appointment letter' }
    };
  }
}

/** Submitted evaluations that do not yet have an appointment letter. */
export async function getEligibleEvaluationOptions(): Promise<{
  success: boolean;
  data?: VacancySelectOption[];
  error?: { message?: string };
}> {
  try {
    const evaluations = await prisma.evaluation.findMany({
      where: {
        status: 'submitted',
        appointmentLetter: null
      },
      orderBy: [{ candidateName: 'asc' }],
      select: {
        id: true,
        candidateName: true,
        jobTitle: true,
        evaluationCode: true
      }
    });
    return {
      success: true,
      data: evaluations.map((e) => ({
        id: e.id,
        name: `${e.candidateName} · ${e.jobTitle || e.evaluationCode}`
      }))
    };
  } catch (error: any) {
    console.error('getEligibleEvaluationOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load candidates' }
    };
  }
}

export async function createAppointmentLetter(
  payload: AppointmentLetterPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: AppointmentLetterRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = createPayloadSchema.safeParse(payload);
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

    const data = parsed.data;
    const appointmentDate = parseDay(data.appointmentDate);
    const letterDate = parseDay(data.letterDate);
    if (!appointmentDate) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: { appointmentDate: ['Invalid reporting date'] }
        }
      };
    }
    if (!letterDate) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: { letterDate: ['Invalid letter date'] }
        }
      };
    }

    const evaluation = await prisma.evaluation.findUnique({
      where: { id: data.evaluationId }
    });
    if (!evaluation) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: { evaluationId: ['Evaluation was not found'] }
        }
      };
    }
    if (evaluation.status !== 'submitted') {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: {
            evaluationId: ['Only submitted evaluations can receive a letter']
          }
        }
      };
    }

    const existing = await prisma.appointmentLetter.findUnique({
      where: { evaluationId: evaluation.id }
    });
    if (existing) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: {
            evaluationId: ['An appointment letter already exists for this evaluation']
          }
        }
      };
    }

    const application = await prisma.application.findUnique({
      where: { id: evaluation.applicationId }
    });

    const generated = await generateRecordCode(APPOINTMENT_LETTER_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: {
          message: 'Failed to generate letter number. Please try again.'
        }
      };
    }

    const auditUser = toAuditUser(user);
    const created = await prisma.appointmentLetter.create({
      data: {
        letterNumber: generated.code,
        evaluationId: evaluation.id,
        evaluationCode: evaluation.evaluationCode,
        applicationId: evaluation.applicationId,
        applicationCode: evaluation.applicationCode,
        candidateName: evaluation.candidateName,
        position: data.position || evaluation.jobTitle,
        department: data.department || application?.departmentName || '',
        employmentType: data.employmentType,
        appointmentDate,
        salary: data.salary,
        letterDate,
        reportingLocation: data.reportingLocation,
        reportingManager: data.reportingManager,
        probationPeriod: data.probationPeriod,
        benefits: data.benefits,
        termsAndConditions: data.termsAndConditions,
        status: 'draft',
        letterGenerated: false,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      }
    });

    const [withUsers] = await resolveAuthUsers([created]);
    return {
      success: true,
      data: mapAppointmentLetterRecord(withUsers),
      message: 'Appointment letter draft saved'
    };
  } catch (error: any) {
    console.error('createAppointmentLetter error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to create appointment letter' }
    };
  }
}

export async function updateAppointmentLetter(
  id: string,
  payload: AppointmentLetterUpdatePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: AppointmentLetterRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid letter ID' } };
    }

    const parsed = letterFieldsSchema.safeParse(payload);
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

    const existing = await prisma.appointmentLetter.findUnique({
      where: { id }
    });
    if (!existing) {
      return { success: false, error: { message: 'Appointment letter not found' } };
    }
    if (existing.status === 'declined') {
      return {
        success: false,
        error: { message: 'Declined letters cannot be edited' }
      };
    }

    const data = parsed.data;
    const appointmentDate = parseDay(data.appointmentDate);
    const letterDate = parseDay(data.letterDate);
    if (!appointmentDate || !letterDate) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: {
            ...(!appointmentDate
              ? { appointmentDate: ['Invalid reporting date'] }
              : {}),
            ...(!letterDate ? { letterDate: ['Invalid letter date'] } : {})
          }
        }
      };
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.appointmentLetter.update({
      where: { id },
      data: {
        position: data.position || existing.position,
        department: data.department || existing.department,
        employmentType: data.employmentType,
        appointmentDate,
        salary: data.salary,
        letterDate,
        reportingLocation: data.reportingLocation,
        reportingManager: data.reportingManager,
        probationPeriod: data.probationPeriod,
        benefits: data.benefits,
        termsAndConditions: data.termsAndConditions,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapAppointmentLetterRecord(withUsers),
      message: 'Appointment letter updated'
    };
  } catch (error: any) {
    console.error('updateAppointmentLetter error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update appointment letter' }
    };
  }
}

export async function generateAppointmentLetter(
  id: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: AppointmentLetterRecord;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid letter ID' } };
    }
    const existing = await prisma.appointmentLetter.findUnique({
      where: { id }
    });
    if (!existing) {
      return { success: false, error: { message: 'Appointment letter not found' } };
    }
    if (existing.status === 'declined') {
      return {
        success: false,
        error: { message: 'Cannot generate a declined letter' }
      };
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.appointmentLetter.update({
      where: { id },
      data: {
        letterGenerated: true,
        status:
          existing.status === 'draft' ? 'pending_approval' : existing.status,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapAppointmentLetterRecord(withUsers),
      message: 'Letter generated'
    };
  } catch (error: any) {
    console.error('generateAppointmentLetter error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to generate letter' }
    };
  }
}

export async function sendAppointmentLetter(
  id: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: AppointmentLetterRecord;
  message?: string;
  emailed?: boolean;
  smsSent?: boolean;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid letter ID' } };
    }
    const existing = await prisma.appointmentLetter.findUnique({
      where: { id }
    });
    if (!existing) {
      return { success: false, error: { message: 'Appointment letter not found' } };
    }
    if (!existing.letterGenerated) {
      return {
        success: false,
        error: { message: 'Generate the letter before sending' }
      };
    }
    if (existing.status === 'declined' || existing.status === 'accepted') {
      return {
        success: false,
        error: { message: 'This letter can no longer be sent' }
      };
    }

    const application = await prisma.application.findUnique({
      where: { id: existing.applicationId },
      select: { candidateEmail: true, candidatePhone: true }
    });

    const email = application?.candidateEmail?.trim() ?? '';
    const phone = application?.candidatePhone?.trim() ?? '';

    if (!email && !phone) {
      return {
        success: false,
        error: {
          message:
            'Candidate has no email or phone on the application — cannot notify'
        }
      };
    }

    const templateInput = {
      candidateName: existing.candidateName,
      letterNumber: existing.letterNumber,
      position: existing.position,
      department: existing.department,
      appointmentDate: toYmdLabel(existing.appointmentDate),
      salary: existing.salary
    };

    let emailed = false;
    let smsSent = false;
    const failures: string[] = [];

    if (email) {
      const content = appointmentLetterEmailTemplate(templateInput);
      const sent = await sendEmail(email, content.subject, content.text, {
        html: content.html
      });
      emailed = sent.status;
      if (!sent.status) {
        failures.push(sent.error ?? 'Email failed');
      }
    }

    if (phone) {
      const text = appointmentLetterSmsTemplate({
        candidateName: existing.candidateName,
        letterNumber: existing.letterNumber,
        position: existing.position,
        appointmentDate: toYmdLabel(existing.appointmentDate)
      });
      const sent = await sendSms(phone, text);
      smsSent = sent.status;
      if (!sent.status) {
        failures.push(sent.error ?? 'SMS failed');
      }
    }

    if (!emailed && !smsSent) {
      return {
        success: false,
        error: {
          message: failures.join('; ') || 'Failed to notify candidate'
        }
      };
    }

    const auditUser = toAuditUser(user);
    const actor = actorLabel(auditUser);
    const updated = await prisma.appointmentLetter.update({
      where: { id },
      data: {
        status: 'issued',
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    const applicationFull = await prisma.application.findUnique({
      where: { id: existing.applicationId }
    });
    if (applicationFull && applicationFull.status === 'active') {
      await prisma.application.update({
        where: { id: applicationFull.id },
        data: {
          currentStage: 'offer',
          history: [
            ...(applicationFull.history ?? []),
            historyEntry(
              'Offer issued',
              `${updated.letterNumber} sent to candidate`,
              actor
            )
          ],
          ...(auditUser?.id && { updatedBy: auditUser.id })
        }
      });
    }

    const [withUsers] = await resolveAuthUsers([updated]);
    const channels = [
      emailed ? 'email' : null,
      smsSent ? 'SMS' : null
    ].filter(Boolean);
    return {
      success: true,
      data: mapAppointmentLetterRecord(withUsers),
      emailed,
      smsSent,
      message: `Letter issued via ${channels.join(' + ')}${
        failures.length ? ` (${failures.join('; ')})` : ''
      }`
    };
  } catch (error: any) {
    console.error('sendAppointmentLetter error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to send appointment letter' }
    };
  }
}

export async function acceptAppointmentLetter(
  id: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: AppointmentLetterRecord;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid letter ID' } };
    }
    const existing = await prisma.appointmentLetter.findUnique({
      where: { id }
    });
    if (!existing) {
      return { success: false, error: { message: 'Appointment letter not found' } };
    }
    if (
      existing.status !== 'issued' &&
      existing.status !== 'pending_approval'
    ) {
      return {
        success: false,
        error: { message: 'Only issued / pending letters can be accepted' }
      };
    }

    const auditUser = toAuditUser(user);
    const actor = actorLabel(auditUser);
    const updated = await prisma.appointmentLetter.update({
      where: { id },
      data: {
        status: 'accepted',
        declineReason: null,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    const application = await prisma.application.findUnique({
      where: { id: existing.applicationId }
    });
    if (application && application.status === 'active') {
      await prisma.application.update({
        where: { id: application.id },
        data: {
          currentStage: 'hired',
          status: 'hired',
          history: [
            ...(application.history ?? []),
            historyEntry(
              'Offer accepted',
              `${updated.letterNumber} accepted`,
              actor
            )
          ],
          ...(auditUser?.id && { updatedBy: auditUser.id })
        }
      });
    }

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapAppointmentLetterRecord(withUsers),
      message: 'Offer accepted'
    };
  } catch (error: any) {
    console.error('acceptAppointmentLetter error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to accept offer' }
    };
  }
}

export async function declineAppointmentLetter(
  id: string,
  reason?: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: AppointmentLetterRecord;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid letter ID' } };
    }
    const existing = await prisma.appointmentLetter.findUnique({
      where: { id }
    });
    if (!existing) {
      return { success: false, error: { message: 'Appointment letter not found' } };
    }
    if (
      existing.status !== 'issued' &&
      existing.status !== 'pending_approval'
    ) {
      return {
        success: false,
        error: { message: 'Only issued / pending letters can be declined' }
      };
    }

    const auditUser = toAuditUser(user);
    const actor = actorLabel(auditUser);
    const declineReason = reason?.trim() || null;
    const updated = await prisma.appointmentLetter.update({
      where: { id },
      data: {
        status: 'declined',
        declineReason,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    const application = await prisma.application.findUnique({
      where: { id: existing.applicationId }
    });
    if (application && application.status === 'active') {
      await prisma.application.update({
        where: { id: application.id },
        data: {
          history: [
            ...(application.history ?? []),
            historyEntry(
              'Offer declined',
              declineReason
                ? `${updated.letterNumber}: ${declineReason}`
                : `${updated.letterNumber} declined`,
              actor
            )
          ],
          ...(auditUser?.id && { updatedBy: auditUser.id })
        }
      });
    }

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapAppointmentLetterRecord(withUsers),
      message: 'Offer declined'
    };
  } catch (error: any) {
    console.error('declineAppointmentLetter error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to decline offer' }
    };
  }
}
