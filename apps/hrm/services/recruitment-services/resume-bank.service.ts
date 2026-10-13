'use server';

import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import {
  APPLICATION_SOURCES,
  RESUME_BANK_CODE_PREFIX,
  RESUME_BANK_STATUSES,
  type ApplicationSource,
  type GetResumeBankParams,
  type ResumeBankPayload,
  type ResumeBankRecord,
  type ResumeBankStatus,
  type ResumeBankSummary
} from '@/types/recruitment';

const sourceSchema = z.enum(APPLICATION_SOURCES);
const statusSchema = z.enum(RESUME_BANK_STATUSES);

const resumeBankPayloadSchema = z.object({
  candidateName: z.string().trim().min(1, 'Candidate name is required').max(200),
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .max(200),
  phone: z.string().trim().optional().default(''),
  qualifications: z.string().trim().optional().default(''),
  experienceYears: z.coerce
    .number()
    .int('Enter a whole number of years')
    .min(0, 'Experience cannot be negative')
    .max(60, 'Experience looks too high'),
  skills: z.array(z.string().trim()).optional().default([]),
  preferredPosition: z.string().trim().optional().default(''),
  preferredDepartment: z.string().trim().optional().default(''),
  location: z.string().trim().optional().default(''),
  source: sourceSchema,
  status: statusSchema.optional().default('in_bank'),
  notes: z.string().trim().optional().default(''),
  resumeFileName: z.string().trim().optional().default(''),
  resumeFileKey: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((value) => (value == null || value === '' ? null : value))
});

function toIso(date?: Date | null): string {
  if (!date) return '';
  return date.toISOString();
}

function experienceRangeFilter(
  experience?: string
): Prisma.IntFilter | undefined {
  if (!experience) return undefined;
  switch (experience) {
    case '0-1':
      return { gte: 0, lte: 1 };
    case '1-3':
      return { gt: 1, lte: 3 };
    case '3-5':
      return { gt: 3, lte: 5 };
    case '5+':
      return { gt: 5 };
    default:
      return undefined;
  }
}

function mapResumeBankRecord(
  record: {
    id: string;
    profileId: string;
    candidateName: string;
    resumeFileName: string;
    resumeFileKey: string | null;
    email: string;
    phone: string;
    qualifications: string;
    experienceYears: number;
    skills: string[];
    preferredPosition: string;
    preferredDepartment: string;
    location: string;
    source: string;
    status: string;
    notes: string;
    linkedApplicationIds: string[];
    createdAt: Date;
    updatedAt: Date;
    createdUser?: { name: string } | null;
    updatedUser?: { name: string } | null;
  }
): ResumeBankRecord {
  return {
    id: record.id,
    profileId: record.profileId,
    candidateName: record.candidateName,
    resumeFileName: record.resumeFileName,
    resumeFileKey: record.resumeFileKey,
    email: record.email,
    phone: record.phone,
    qualifications: record.qualifications,
    experienceYears: record.experienceYears,
    skills: record.skills ?? [],
    preferredPosition: record.preferredPosition,
    preferredDepartment: record.preferredDepartment,
    location: record.location,
    source: record.source as ApplicationSource,
    dateAdded: toIso(record.createdAt),
    status: record.status as ResumeBankStatus,
    notes: record.notes,
    linkedApplicationIds: [...(record.linkedApplicationIds ?? [])],
    createdAt: toIso(record.createdAt),
    createdBy: record.createdUser?.name ?? '',
    updatedAt: toIso(record.updatedAt),
    updatedBy: record.updatedUser?.name ?? ''
  };
}

function buildResumeBankWhere(
  params: GetResumeBankParams
): Prisma.ResumeBankProfileWhereInput {
  const and: Prisma.ResumeBankProfileWhereInput[] = [];
  const where: Prisma.ResumeBankProfileWhereInput = {};

  if (params.qualification?.trim()) {
    and.push({
      qualifications: {
        contains: params.qualification.trim(),
        mode: Prisma.QueryMode.insensitive
      }
    });
  }
  if (params.location?.trim()) {
    and.push({
      location: {
        contains: params.location.trim(),
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
  if (params.designation?.trim()) {
    and.push({
      preferredPosition: {
        contains: params.designation.trim(),
        mode: Prisma.QueryMode.insensitive
      }
    });
  }
  if (params.department?.trim()) {
    and.push({
      preferredDepartment: {
        contains: params.department.trim(),
        mode: Prisma.QueryMode.insensitive
      }
    });
  }
  if (params.source?.trim()) {
    and.push({ source: params.source.trim() });
  }

  const exp = experienceRangeFilter(params.experience);
  if (exp) {
    and.push({ experienceYears: exp });
  }

  const skillsQ = params.skills?.trim();
  if (skillsQ) {
    // Mongo string[] has no insensitive contains — match exact skill token or notes.
    and.push({
      OR: [
        { skills: { has: skillsQ } },
        {
          notes: {
            contains: skillsQ,
            mode: Prisma.QueryMode.insensitive
          }
        }
      ]
    });
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
        { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { phone: { contains: search, mode: Prisma.QueryMode.insensitive } },
        {
          qualifications: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          preferredPosition: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          preferredDepartment: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          location: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          resumeFileName: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          profileId: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        },
        { skills: { has: search } }
      ]
    });
  }

  if (and.length) where.AND = and;
  return where;
}

export async function getResumeBankProfiles(
  params: GetResumeBankParams
): Promise<{
  success: boolean;
  data?: { records: ResumeBankRecord[]; totalRecords: number };
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
    const where = buildResumeBankWhere(params);

    const [rows, totalRecords] = await Promise.all([
      prisma.resumeBankProfile.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.resumeBankProfile.count({ where })
    ]);

    const withUsers = await resolveAuthUsers(rows);
    return {
      success: true,
      data: {
        records: withUsers.map(mapResumeBankRecord),
        totalRecords
      },
      message: 'Resume bank profiles fetched successfully'
    };
  } catch (error: any) {
    console.error('getResumeBankProfiles error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch resume bank profiles' }
    };
  }
}

export async function getResumeBankProfilesForExport(
  params: Omit<GetResumeBankParams, 'page' | 'limit'>
): Promise<{
  success: boolean;
  data?: ResumeBankRecord[];
  totalRecords?: number;
  error?: { message?: string };
}> {
  try {
    const where = buildResumeBankWhere(params);
    const rows = await prisma.resumeBankProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    const withUsers = await resolveAuthUsers(rows);
    const records = withUsers.map(mapResumeBankRecord);
    return { success: true, data: records, totalRecords: records.length };
  } catch (error: any) {
    console.error('getResumeBankProfilesForExport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export resume bank' }
    };
  }
}

export async function getResumeBankSummary(): Promise<{
  success: boolean;
  data?: ResumeBankSummary;
  error?: { message?: string };
}> {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [profilesInBank, addedThisMonth, linkedToApplications, clinicalDesignations] =
      await Promise.all([
        prisma.resumeBankProfile.count(),
        prisma.resumeBankProfile.count({
          where: { createdAt: { gte: monthStart } }
        }),
        prisma.resumeBankProfile.count({
          where: {
            OR: [
              { status: 'linked' },
              { NOT: { linkedApplicationIds: { equals: [] } } }
            ]
          }
        }),
        prisma.designation.findMany({
          where: { categoryId: 'clinical' },
          select: { name: true }
        })
      ]);

    let clinicalProfilesPercent = 0;
    if (profilesInBank > 0) {
      const clinicalNames = clinicalDesignations
        .map((d) => d.name.trim().toLowerCase())
        .filter(Boolean);
      if (clinicalNames.length) {
        const clinicalCount = await prisma.resumeBankProfile.count({
          where: {
            OR: clinicalNames.map((name) => ({
              preferredPosition: {
                contains: name,
                mode: Prisma.QueryMode.insensitive
              }
            }))
          }
        });
        clinicalProfilesPercent = Math.round(
          (clinicalCount / profilesInBank) * 100
        );
      }
    }

    return {
      success: true,
      data: {
        profilesInBank,
        addedThisMonth,
        linkedToApplications,
        clinicalProfilesPercent
      }
    };
  } catch (error: any) {
    console.error('getResumeBankSummary error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch resume bank summary' }
    };
  }
}

export async function getResumeBankProfileById(id: string): Promise<{
  success: boolean;
  data?: ResumeBankRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid profile ID' } };
    }
    const row = await prisma.resumeBankProfile.findUnique({ where: { id } });
    if (!row) {
      return { success: false, error: { message: 'Profile not found' } };
    }
    const [withUsers] = await resolveAuthUsers([row]);
    return { success: true, data: mapResumeBankRecord(withUsers) };
  } catch (error: any) {
    console.error('getResumeBankProfileById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch profile' }
    };
  }
}

export async function createResumeBankProfile(
  payload: ResumeBankPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ResumeBankRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = resumeBankPayloadSchema.safeParse(payload);
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
    const generated = await generateRecordCode(RESUME_BANK_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: {
          message: 'Failed to generate profile code. Please try again.'
        }
      };
    }

    const created = await prisma.resumeBankProfile.create({
      data: {
        profileId: generated.code,
        candidateName: data.candidateName,
        email: data.email,
        phone: data.phone,
        qualifications: data.qualifications,
        experienceYears: data.experienceYears,
        skills: data.skills,
        preferredPosition: data.preferredPosition,
        preferredDepartment: data.preferredDepartment,
        location: data.location,
        source: data.source,
        status: data.status,
        notes: data.notes,
        resumeFileName: data.resumeFileName,
        resumeFileKey: data.resumeFileKey ?? null,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      }
    });

    const [withUsers] = await resolveAuthUsers([created]);
    return {
      success: true,
      data: mapResumeBankRecord(withUsers),
      message: 'Profile created successfully'
    };
  } catch (error: any) {
    console.error('createResumeBankProfile error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to create profile' }
    };
  }
}

export async function updateResumeBankProfile(
  id: string,
  payload: ResumeBankPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ResumeBankRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid profile ID' } };
    }

    const parsed = resumeBankPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const existing = await prisma.resumeBankProfile.findUnique({
      where: { id }
    });
    if (!existing) {
      return { success: false, error: { message: 'Profile not found' } };
    }

    const data = parsed.data;
    const auditUser = toAuditUser(user);

    const updated = await prisma.resumeBankProfile.update({
      where: { id },
      data: {
        candidateName: data.candidateName,
        email: data.email,
        phone: data.phone,
        qualifications: data.qualifications,
        experienceYears: data.experienceYears,
        skills: data.skills,
        preferredPosition: data.preferredPosition,
        preferredDepartment: data.preferredDepartment,
        location: data.location,
        source: data.source,
        status: data.status,
        notes: data.notes,
        resumeFileName: data.resumeFileName,
        resumeFileKey: data.resumeFileKey ?? null,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapResumeBankRecord(withUsers),
      message: 'Profile updated successfully'
    };
  } catch (error: any) {
    console.error('updateResumeBankProfile error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update profile' }
    };
  }
}

export async function markResumeBankShortlisted(
  id: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ResumeBankRecord;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid profile ID' } };
    }
    const existing = await prisma.resumeBankProfile.findUnique({
      where: { id }
    });
    if (!existing) {
      return { success: false, error: { message: 'Profile not found' } };
    }
    if (existing.status === 'shortlisted') {
      const [withUsers] = await resolveAuthUsers([existing]);
      return {
        success: true,
        data: mapResumeBankRecord(withUsers),
        message: 'Profile is already shortlisted'
      };
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.resumeBankProfile.update({
      where: { id },
      data: {
        status: 'shortlisted',
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });
    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapResumeBankRecord(withUsers),
      message: 'Profile moved to shortlisting'
    };
  } catch (error: any) {
    console.error('markResumeBankShortlisted error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update profile status' }
    };
  }
}

/** Published job posts for Add-to-Job select (Application create is Wave 4). */
export async function getPublishedJobPostOptions(): Promise<{
  success: boolean;
  data?: { id: string; name: string }[];
  error?: { message?: string };
}> {
  try {
    const rows = await prisma.jobPost.findMany({
      where: { status: 'published' },
      orderBy: { jobPostId: 'asc' },
      select: {
        id: true,
        jobPostId: true,
        jobTitle: true
      }
    });
    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        name: `${row.jobPostId} — ${row.jobTitle}`
      }))
    };
  } catch (error: any) {
    console.error('getPublishedJobPostOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load job posts' }
    };
  }
}
