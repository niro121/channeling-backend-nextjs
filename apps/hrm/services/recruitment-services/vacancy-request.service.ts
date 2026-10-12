'use server';

import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import {
  VACANCY_EMPLOYMENT_TYPES,
  VACANCY_PRIORITIES,
  VACANCY_REQUEST_CODE_PREFIX,
  VACANCY_REQUEST_STATUSES,
  isVacancyEditable,
  type GetVacancyRequestsParams,
  type VacancyRequestPayload,
  type VacancyRequestRecord,
  type VacancyRequestStatus,
  type VacancyRequestSummary
} from '@/types/recruitment';

const employmentTypeSchema = z.enum(VACANCY_EMPLOYMENT_TYPES);
const prioritySchema = z.enum(VACANCY_PRIORITIES);
const statusSchema = z.enum(VACANCY_REQUEST_STATUSES);

const vacancyRequestPayloadSchema = z.object({
  departmentId: z.string().min(1, 'Department is required'),
  designationId: z.string().min(1, 'Designation is required'),
  vacancies: z.coerce
    .number()
    .int('Enter a whole number of at least 1')
    .min(1, 'Enter a whole number of at least 1'),
  employmentType: employmentTypeSchema,
  requiredQualifications: z.string().trim().optional().default(''),
  requiredExperience: z.string().trim().optional().default(''),
  skills: z.array(z.string().trim()).optional().default([]),
  jobDescription: z.string().trim().optional().default(''),
  salaryRange: z.string().trim().optional().default(''),
  requiredDate: z.coerce.date({
    message: 'Required date is required'
  }),
  priority: prioritySchema,
  justification: z
    .string()
    .trim()
    .min(1, 'Justification is required'),
  remarks: z.string().trim().optional().default(''),
  submitIntent: z.enum(['draft', 'submit']).optional().default('draft')
});

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

function toIso(date?: Date | null): string {
  if (!date) return '';
  return date.toISOString();
}

function mapVacancyRecord(
  record: {
    id: string;
    requestId: string;
    departmentId: string;
    designationId: string;
    departmentName: string;
    designationName: string;
    vacancies: number;
    employmentType: string;
    priority: string;
    status: string;
    requiredQualifications: string;
    requiredExperience: string;
    skills: string[];
    jobDescription: string;
    salaryRange: string;
    justification: string;
    remarks: string;
    requiredDate: Date;
    requestedDate: Date | null;
    requestedByName: string | null;
    linkedJobPost: boolean;
    rejectReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string | null;
    updatedBy?: string | null;
    createdUser?: { name: string } | null;
    updatedUser?: { name: string } | null;
  }
): VacancyRequestRecord {
  return {
    id: record.id,
    requestId: record.requestId,
    departmentId: record.departmentId,
    designationId: record.designationId,
    department: record.departmentName,
    designation: record.designationName,
    vacancies: record.vacancies,
    employmentType: record.employmentType as VacancyRequestRecord['employmentType'],
    requestedBy: record.requestedByName ?? '',
    requestedDate: toIso(record.requestedDate),
    requiredDate: toIso(record.requiredDate),
    priority: record.priority as VacancyRequestRecord['priority'],
    status: record.status as VacancyRequestStatus,
    requiredQualifications: record.requiredQualifications,
    requiredExperience: record.requiredExperience,
    skills: record.skills ?? [],
    jobDescription: record.jobDescription,
    salaryRange: record.salaryRange,
    justification: record.justification,
    remarks: record.remarks,
    linkedJobPost: record.linkedJobPost,
    rejectReason: record.rejectReason ?? undefined,
    createdAt: toIso(record.createdAt),
    createdBy: record.createdUser?.name ?? '',
    updatedAt: toIso(record.updatedAt),
    updatedBy: record.updatedUser?.name ?? ''
  };
}

function buildVacancyWhere(
  params: GetVacancyRequestsParams
): Prisma.VacancyRequestWhereInput {
  const where: Prisma.VacancyRequestWhereInput = {};
  const and: Prisma.VacancyRequestWhereInput[] = [];

  const requestId = params.requestId?.trim();
  if (requestId) {
    and.push({
      requestId: { contains: requestId, mode: Prisma.QueryMode.insensitive }
    });
  }

  if (params.department && params.department !== '__all__') {
    where.departmentId = params.department;
  }

  if (params.designation && params.designation !== '__all__') {
    where.designationId = params.designation;
  }

  if (params.employmentType && params.employmentType !== '__all__') {
    const parsed = employmentTypeSchema.safeParse(params.employmentType);
    if (parsed.success) where.employmentType = parsed.data;
  }

  if (params.status && params.status !== '__all__') {
    const parsed = statusSchema.safeParse(params.status);
    if (parsed.success) where.status = parsed.data;
  }

  const requestedBy = params.requestedBy?.trim();
  if (requestedBy) {
    and.push({
      requestedByName: {
        contains: requestedBy,
        mode: Prisma.QueryMode.insensitive
      }
    });
  }

  if (params.requestDate) {
    const range = dayRange(params.requestDate);
    if (range) where.requestedDate = range;
  }

  if (params.requiredDate) {
    const range = dayRange(params.requiredDate);
    if (range) where.requiredDate = range;
  }

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        { requestId: { contains: search, mode: Prisma.QueryMode.insensitive } },
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
          requestedByName: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          employmentType: {
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

async function resolveOrgLabels(
  departmentId: string,
  designationId: string
): Promise<
  | { ok: true; departmentName: string; designationName: string }
  | { ok: false; message: string; issues?: Record<string, string[]> }
> {
  const [department, designation] = await Promise.all([
    prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, name: true, status: true }
    }),
    prisma.designation.findUnique({
      where: { id: designationId },
      select: { id: true, name: true }
    })
  ]);

  if (!department) {
    return {
      ok: false,
      message: 'Validation failed',
      issues: { departmentId: ['Selected department was not found'] }
    };
  }
  if (department.status !== 1) {
    return {
      ok: false,
      message: 'Validation failed',
      issues: { departmentId: ['Selected department is not active'] }
    };
  }
  if (!designation) {
    return {
      ok: false,
      message: 'Validation failed',
      issues: { designationId: ['Selected designation was not found'] }
    };
  }

  return {
    ok: true,
    departmentName: department.name,
    designationName: designation.name
  };
}

export async function getVacancyRequests(
  params: GetVacancyRequestsParams
): Promise<{
  success: boolean;
  data?: { records: VacancyRequestRecord[]; totalRecords: number };
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
    const where = buildVacancyWhere(params);

    const [rows, totalRecords] = await Promise.all([
      prisma.vacancyRequest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.vacancyRequest.count({ where })
    ]);

    const withUsers = await resolveAuthUsers(rows);
    return {
      success: true,
      data: {
        records: withUsers.map(mapVacancyRecord),
        totalRecords
      },
      message: 'Vacancy requests fetched successfully'
    };
  } catch (error: any) {
    console.error('getVacancyRequests error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch vacancy requests' }
    };
  }
}

export async function getVacancyRequestsForExport(
  params: Omit<GetVacancyRequestsParams, 'page' | 'limit'>
): Promise<{
  success: boolean;
  data?: VacancyRequestRecord[];
  totalRecords?: number;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const where = buildVacancyWhere(params);
    const rows = await prisma.vacancyRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    const withUsers = await resolveAuthUsers(rows);
    const records = withUsers.map(mapVacancyRecord);
    return {
      success: true,
      data: records,
      totalRecords: records.length,
      message: 'Vacancy requests export fetched successfully'
    };
  } catch (error: any) {
    console.error('getVacancyRequestsForExport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export vacancy requests' }
    };
  }
}

export async function getVacancyRequestSummary(): Promise<{
  success: boolean;
  data?: VacancyRequestSummary;
  error?: { message?: string };
}> {
  try {
    const openStatuses: VacancyRequestStatus[] = [
      'draft',
      'pending_approval',
      'approved'
    ];

    const [openRequests, pendingApproval, approved, positionAgg] =
      await Promise.all([
        prisma.vacancyRequest.count({
          where: { status: { in: openStatuses } }
        }),
        prisma.vacancyRequest.count({
          where: { status: 'pending_approval' }
        }),
        prisma.vacancyRequest.count({
          where: { status: 'approved' }
        }),
        prisma.vacancyRequest.aggregate({
          where: { status: { in: openStatuses } },
          _sum: { vacancies: true }
        })
      ]);

    return {
      success: true,
      data: {
        openRequests,
        pendingApproval,
        approved,
        totalPositions: positionAgg._sum.vacancies ?? 0
      }
    };
  } catch (error: any) {
    console.error('getVacancyRequestSummary error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch vacancy summary' }
    };
  }
}

export async function getVacancyRequestById(id: string): Promise<{
  success: boolean;
  data?: VacancyRequestRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid vacancy request ID' } };
    }

    const row = await prisma.vacancyRequest.findUnique({ where: { id } });
    if (!row) {
      return { success: false, error: { message: 'Vacancy request not found' } };
    }

    const [withUsers] = await resolveAuthUsers([row]);
    return { success: true, data: mapVacancyRecord(withUsers) };
  } catch (error: any) {
    console.error('getVacancyRequestById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get vacancy request' }
    };
  }
}

export async function createVacancyRequest(
  payload: VacancyRequestPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: VacancyRequestRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = vacancyRequestPayloadSchema.safeParse(payload);
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
    const labels = await resolveOrgLabels(data.departmentId, data.designationId);
    if (!labels.ok) {
      return {
        success: false,
        error: { message: labels.message, issues: labels.issues }
      };
    }

    const generated = await generateRecordCode(VACANCY_REQUEST_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: {
          message: 'Failed to generate vacancy request code. Please try again.'
        }
      };
    }

    const status: VacancyRequestStatus =
      data.submitIntent === 'submit' ? 'pending_approval' : 'draft';
    const now = new Date();

    const created = await prisma.vacancyRequest.create({
      data: {
        requestId: generated.code,
        departmentId: data.departmentId,
        designationId: data.designationId,
        departmentName: labels.departmentName,
        designationName: labels.designationName,
        vacancies: data.vacancies,
        employmentType: data.employmentType,
        priority: data.priority,
        status,
        requiredQualifications: data.requiredQualifications,
        requiredExperience: data.requiredExperience,
        skills: data.skills,
        jobDescription: data.jobDescription,
        salaryRange: data.salaryRange,
        justification: data.justification,
        remarks: data.remarks,
        requiredDate: data.requiredDate,
        requestedDate: now,
        requestedById: auditUser?.id ?? null,
        requestedByName: auditUser?.name ?? null,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      }
    });

    const [withUsers] = await resolveAuthUsers([created]);
    return {
      success: true,
      data: mapVacancyRecord(withUsers),
      message:
        status === 'pending_approval'
          ? 'Vacancy request submitted for approval'
          : 'Vacancy request saved as draft'
    };
  } catch (error: any) {
    console.error('createVacancyRequest error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Duplicate record detected',
          issues: { requestId: ['Vacancy request code already exists'] }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create vacancy request' }
    };
  }
}

export async function updateVacancyRequest(
  id: string,
  payload: VacancyRequestPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: VacancyRequestRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid vacancy request ID' } };
    }

    const parsed = vacancyRequestPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const existing = await prisma.vacancyRequest.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'Vacancy request not found' } };
    }

    const currentStatus = existing.status as VacancyRequestStatus;
    if (!isVacancyEditable(currentStatus)) {
      return {
        success: false,
        error: {
          message: `Cannot edit a vacancy request with status "${currentStatus}"`
        }
      };
    }

    const data = parsed.data;
    const auditUser = toAuditUser(user);
    const labels = await resolveOrgLabels(data.departmentId, data.designationId);
    if (!labels.ok) {
      return {
        success: false,
        error: { message: labels.message, issues: labels.issues }
      };
    }

    let nextStatus = currentStatus;
    if (data.submitIntent === 'submit' && currentStatus === 'draft') {
      nextStatus = 'pending_approval';
    }

    const updated = await prisma.vacancyRequest.update({
      where: { id },
      data: {
        departmentId: data.departmentId,
        designationId: data.designationId,
        departmentName: labels.departmentName,
        designationName: labels.designationName,
        vacancies: data.vacancies,
        employmentType: data.employmentType,
        priority: data.priority,
        status: nextStatus,
        requiredQualifications: data.requiredQualifications,
        requiredExperience: data.requiredExperience,
        skills: data.skills,
        jobDescription: data.jobDescription,
        salaryRange: data.salaryRange,
        justification: data.justification,
        remarks: data.remarks,
        requiredDate: data.requiredDate,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapVacancyRecord(withUsers),
      message:
        nextStatus === 'pending_approval' && currentStatus === 'draft'
          ? 'Vacancy request submitted for approval'
          : 'Vacancy request updated successfully'
    };
  } catch (error: any) {
    console.error('updateVacancyRequest error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update vacancy request' }
    };
  }
}

export async function approveVacancyRequest(
  id: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: VacancyRequestRecord;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid vacancy request ID' } };
    }

    const auditUser = toAuditUser(user);
    if (!auditUser?.id) {
      return {
        success: false,
        error: { message: 'Approver identity is required' }
      };
    }

    const existing = await prisma.vacancyRequest.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'Vacancy request not found' } };
    }
    if (existing.status !== 'pending_approval') {
      return {
        success: false,
        error: {
          message: `Cannot approve a vacancy request with status "${existing.status}"`
        }
      };
    }

    const updated = await prisma.vacancyRequest.update({
      where: { id },
      data: {
        status: 'approved',
        decidedById: auditUser.id,
        decidedByName: auditUser.name ?? null,
        decidedAt: new Date(),
        rejectReason: null,
        updatedBy: auditUser.id
      }
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapVacancyRecord(withUsers),
      message: 'Vacancy request approved successfully'
    };
  } catch (error: any) {
    console.error('approveVacancyRequest error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to approve vacancy request' }
    };
  }
}

export async function rejectVacancyRequest(
  id: string,
  reason: string | undefined,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: VacancyRequestRecord;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid vacancy request ID' } };
    }

    const auditUser = toAuditUser(user);
    if (!auditUser?.id) {
      return {
        success: false,
        error: { message: 'Approver identity is required' }
      };
    }

    const existing = await prisma.vacancyRequest.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'Vacancy request not found' } };
    }
    if (existing.status !== 'pending_approval') {
      return {
        success: false,
        error: {
          message: `Cannot reject a vacancy request with status "${existing.status}"`
        }
      };
    }

    const updated = await prisma.vacancyRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        decidedById: auditUser.id,
        decidedByName: auditUser.name ?? null,
        decidedAt: new Date(),
        rejectReason: reason?.trim() || null,
        updatedBy: auditUser.id
      }
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapVacancyRecord(withUsers),
      message: 'Vacancy request rejected successfully'
    };
  } catch (error: any) {
    console.error('rejectVacancyRequest error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to reject vacancy request' }
    };
  }
}
