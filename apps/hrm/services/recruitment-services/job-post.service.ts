'use server';

import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import { slugify } from '@/lib/utils/slug';
import {
  JOB_POST_CODE_PREFIX,
  JOB_POST_STATUSES,
  VACANCY_EMPLOYMENT_TYPES,
  type ApprovedVacancyOption,
  type GetJobPostsParams,
  type JobPostPayload,
  type JobPostRecord,
  type JobPostStatus,
  type JobPostSummary,
  type JobPostVacancyLink,
  type VacancyEmploymentType
} from '@/types/recruitment';

const employmentTypeSchema = z.enum(VACANCY_EMPLOYMENT_TYPES);
const statusSchema = z.enum(JOB_POST_STATUSES);

const jobPostPayloadSchema = z.object({
  linkedVacancyRequestIds: z.array(z.string().min(1)).optional().default([]),
  jobTitle: z.string().trim().min(1, 'Job title is required').max(200),
  slug: z.string().trim().optional().default(''),
  shortDescription: z.string().trim().optional().default(''),
  departmentId: z.string().optional().nullable().default(null),
  designationId: z.string().min(1, 'Designation is required'),
  jobDescription: z.string().trim().optional().default(''),
  responsibilities: z.string().trim().optional().default(''),
  qualifications: z.string().trim().optional().default(''),
  experience: z.string().trim().optional().default(''),
  skills: z.array(z.string().trim()).optional().default([]),
  employmentType: employmentTypeSchema,
  salaryInformation: z.string().trim().optional().default(''),
  openings: z.coerce
    .number()
    .int('Enter a whole number of at least 1')
    .min(1, 'Enter a whole number of at least 1'),
  closingDate: z.coerce.date({ message: 'Closing date is required' }),
  applicationInstructions: z.string().trim().optional().default(''),
  status: statusSchema
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

function toJobPostSlug(input: string): string {
  return slugify(input, { fallback: 'job-post' });
}

function mapJobPostRecord(
  record: {
    id: string;
    jobPostId: string;
    slug: string;
    jobTitle: string;
    shortDescription: string;
    departmentName: string;
    departmentId: string | null;
    designationName: string;
    designationId: string;
    employmentType: string;
    openings: number;
    postedDate: Date | null;
    closingDate: Date;
    applicationsCount: number;
    status: string;
    vacancyRequestIds: string[];
    linkedVacancies: JobPostVacancyLink[];
    jobDescription: string;
    responsibilities: string;
    qualifications: string;
    experience: string;
    skills: string[];
    salaryInformation: string;
    applicationInstructions: string;
    createdAt: Date;
    updatedAt: Date;
    createdUser?: { name: string } | null;
    updatedUser?: { name: string } | null;
  }
): JobPostRecord {
  const linkedVacancies = (record.linkedVacancies ?? []).map((link) => ({
    vacancyRequestId: link.vacancyRequestId,
    requestId: link.requestId,
    departmentId: link.departmentId,
    departmentName: link.departmentName,
    openings: link.openings
  }));
  const linkedVacancyRequestLabel = linkedVacancies
    .map((l) => `${l.requestId} (${l.departmentName})`)
    .join('; ');

  return {
    id: record.id,
    jobPostId: record.jobPostId,
    slug: record.slug,
    jobTitle: record.jobTitle,
    shortDescription: record.shortDescription,
    department: record.departmentName,
    departmentId: record.departmentId ?? undefined,
    designation: record.designationName,
    designationId: record.designationId,
    employmentType: record.employmentType as VacancyEmploymentType,
    openings: record.openings,
    postedDate: record.postedDate ? toIso(record.postedDate) : null,
    closingDate: toIso(record.closingDate),
    applicationsCount: record.applicationsCount,
    status: record.status as JobPostStatus,
    linkedVacancyRequestIds: [...(record.vacancyRequestIds ?? [])],
    linkedVacancies,
    linkedVacancyRequestLabel,
    jobDescription: record.jobDescription,
    responsibilities: record.responsibilities,
    qualifications: record.qualifications,
    experience: record.experience,
    skills: record.skills ?? [],
    salaryInformation: record.salaryInformation,
    applicationInstructions: record.applicationInstructions,
    createdAt: toIso(record.createdAt),
    createdBy: record.createdUser?.name ?? '',
    updatedAt: toIso(record.updatedAt),
    updatedBy: record.updatedUser?.name ?? ''
  };
}

function buildJobPostWhere(
  params: GetJobPostsParams
): Prisma.JobPostWhereInput {
  const where: Prisma.JobPostWhereInput = {};
  const and: Prisma.JobPostWhereInput[] = [];

  const jobTitle = params.jobTitle?.trim();
  if (jobTitle) {
    and.push({
      jobTitle: { contains: jobTitle, mode: Prisma.QueryMode.insensitive }
    });
  }

  if (params.department && params.department !== '__all__') {
    and.push({
      OR: [
        { departmentId: params.department },
        {
          departmentName: {
            contains: params.department,
            mode: Prisma.QueryMode.insensitive
          }
        }
      ]
    });
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

  if (params.postedDate) {
    const range = dayRange(params.postedDate);
    if (range) where.postedDate = range;
  }

  if (params.closingDate) {
    const range = dayRange(params.closingDate);
    if (range) where.closingDate = range;
  }

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        { jobPostId: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { jobTitle: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { slug: { contains: search, mode: Prisma.QueryMode.insensitive } },
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
        { status: { contains: search, mode: Prisma.QueryMode.insensitive } }
      ]
    });
  }

  if (and.length) where.AND = and;
  return where;
}

async function ensureUniqueSlug(
  desired: string,
  excludeId?: string
): Promise<string> {
  const base = toJobPostSlug(desired);
  let candidate = base;
  let attempt = 0;
  while (attempt < 50) {
    const existing = await prisma.jobPost.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      },
      select: { id: true }
    });
    if (!existing) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt + 1}`;
  }
  return `${base}-${Date.now()}`;
}

type ResolvedLinks =
  | {
      ok: true;
      vacancyRequestIds: string[];
      linkedVacancies: JobPostVacancyLink[];
      designationId: string;
      designationName: string;
      employmentType: VacancyEmploymentType;
      departmentId: string | null;
      departmentName: string;
      suggestedOpenings: number;
    }
  | {
      ok: false;
      message: string;
      issues?: Record<string, string[]>;
    };

async function resolveVacancyLinks(
  vacancyIds: string[],
  designationId: string,
  employmentType: VacancyEmploymentType,
  currentJobPostId?: string
): Promise<ResolvedLinks> {
  const uniqueIds = [...new Set(vacancyIds.filter(Boolean))];
  if (!uniqueIds.length) {
    const designation = await prisma.designation.findUnique({
      where: { id: designationId },
      select: { id: true, name: true }
    });
    if (!designation) {
      return {
        ok: false,
        message: 'Validation failed',
        issues: { designationId: ['Selected designation was not found'] }
      };
    }
    return {
      ok: true,
      vacancyRequestIds: [],
      linkedVacancies: [],
      designationId: designation.id,
      designationName: designation.name,
      employmentType,
      departmentId: null,
      departmentName: '',
      suggestedOpenings: 0
    };
  }

  const vacancies = await prisma.vacancyRequest.findMany({
    where: { id: { in: uniqueIds } }
  });

  if (vacancies.length !== uniqueIds.length) {
    return {
      ok: false,
      message: 'Validation failed',
      issues: {
        linkedVacancyRequestIds: ['One or more vacancy requests were not found']
      }
    };
  }

  const designationIds = new Set(vacancies.map((v) => v.designationId));
  if (designationIds.size > 1) {
    return {
      ok: false,
      message: 'Validation failed',
      issues: {
        linkedVacancyRequestIds: [
          'Combined vacancies must share the same designation'
        ]
      }
    };
  }

  const firstDesignationId = vacancies[0]!.designationId;
  if (firstDesignationId !== designationId) {
    return {
      ok: false,
      message: 'Validation failed',
      issues: {
        designationId: [
          'Designation must match the selected vacancy request(s)'
        ]
      }
    };
  }

  const employmentTypes = new Set(vacancies.map((v) => v.employmentType));
  if (employmentTypes.size > 1) {
    return {
      ok: false,
      message: 'Validation failed',
      issues: {
        linkedVacancyRequestIds: [
          'Combined vacancies must share the same employment type'
        ]
      }
    };
  }

  if (vacancies[0]!.employmentType !== employmentType) {
    return {
      ok: false,
      message: 'Validation failed',
      issues: {
        employmentType: [
          'Employment type must match the selected vacancy request(s)'
        ]
      }
    };
  }

  for (const vacancy of vacancies) {
    if (vacancy.status !== 'approved') {
      return {
        ok: false,
        message: 'Validation failed',
        issues: {
          linkedVacancyRequestIds: [
            `Only approved vacancies can be linked (${vacancy.requestId})`
          ]
        }
      };
    }
    if (
      vacancy.linkedJobPost &&
      vacancy.linkedJobPostId &&
      vacancy.linkedJobPostId !== currentJobPostId
    ) {
      return {
        ok: false,
        message: 'Validation failed',
        issues: {
          linkedVacancyRequestIds: [
            `${vacancy.requestId} is already linked to another job post`
          ]
        }
      };
    }
  }

  const linkedVacancies: JobPostVacancyLink[] = vacancies.map((v) => ({
    vacancyRequestId: v.id,
    requestId: v.requestId,
    departmentId: v.departmentId,
    departmentName: v.departmentName,
    openings: v.vacancies
  }));

  const departmentNames = [
    ...new Set(linkedVacancies.map((l) => l.departmentName).filter(Boolean))
  ];
  const departmentId =
    linkedVacancies.length === 1 ? linkedVacancies[0]!.departmentId : null;

  return {
    ok: true,
    vacancyRequestIds: uniqueIds,
    linkedVacancies,
    designationId: firstDesignationId,
    designationName: vacancies[0]!.designationName,
    employmentType,
    departmentId,
    departmentName: departmentNames.join(', '),
    suggestedOpenings: linkedVacancies.reduce((sum, l) => sum + l.openings, 0)
  };
}

async function syncVacancyLinks(
  jobPostId: string,
  nextIds: string[],
  previousIds: string[]
) {
  const nextSet = new Set(nextIds);
  const prevSet = new Set(previousIds);
  const toLink = nextIds.filter((id) => !prevSet.has(id));
  const toUnlink = previousIds.filter((id) => !nextSet.has(id));

  if (toLink.length) {
    await prisma.vacancyRequest.updateMany({
      where: { id: { in: toLink } },
      data: { linkedJobPost: true, linkedJobPostId: jobPostId }
    });
  }
  if (toUnlink.length) {
    await prisma.vacancyRequest.updateMany({
      where: { id: { in: toUnlink }, linkedJobPostId: jobPostId },
      data: { linkedJobPost: false, linkedJobPostId: null }
    });
  }
}

export async function getJobPosts(params: GetJobPostsParams): Promise<{
  success: boolean;
  data?: { records: JobPostRecord[]; totalRecords: number };
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
    const where = buildJobPostWhere(params);

    const [rows, totalRecords] = await Promise.all([
      prisma.jobPost.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.jobPost.count({ where })
    ]);

    const withUsers = await resolveAuthUsers(rows);
    return {
      success: true,
      data: {
        records: withUsers.map(mapJobPostRecord),
        totalRecords
      },
      message: 'Job posts fetched successfully'
    };
  } catch (error: any) {
    console.error('getJobPosts error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch job posts' }
    };
  }
}

export async function getJobPostsForExport(
  params: Omit<GetJobPostsParams, 'page' | 'limit'>
): Promise<{
  success: boolean;
  data?: JobPostRecord[];
  totalRecords?: number;
  error?: { message?: string };
}> {
  try {
    const where = buildJobPostWhere(params);
    const rows = await prisma.jobPost.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    const withUsers = await resolveAuthUsers(rows);
    const records = withUsers.map(mapJobPostRecord);
    return { success: true, data: records, totalRecords: records.length };
  } catch (error: any) {
    console.error('getJobPostsForExport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export job posts' }
    };
  }
}

export async function getJobPostSummary(): Promise<{
  success: boolean;
  data?: JobPostSummary;
  error?: { message?: string };
}> {
  try {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [published, unpublished, applicationsAgg, closingThisWeek] =
      await Promise.all([
        prisma.jobPost.count({ where: { status: 'published' } }),
        prisma.jobPost.count({ where: { status: 'unpublished' } }),
        prisma.jobPost.aggregate({ _sum: { applicationsCount: true } }),
        prisma.jobPost.count({
          where: {
            status: 'published',
            closingDate: { gte: now, lte: weekEnd }
          }
        })
      ]);

    return {
      success: true,
      data: {
        published,
        unpublished,
        applications: applicationsAgg._sum.applicationsCount ?? 0,
        closingThisWeek
      }
    };
  } catch (error: any) {
    console.error('getJobPostSummary error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch job post summary' }
    };
  }
}

export async function getJobPostById(id: string): Promise<{
  success: boolean;
  data?: JobPostRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid job post ID' } };
    }
    const row = await prisma.jobPost.findUnique({ where: { id } });
    if (!row) {
      return { success: false, error: { message: 'Job post not found' } };
    }
    const [withUsers] = await resolveAuthUsers([row]);
    return { success: true, data: mapJobPostRecord(withUsers) };
  } catch (error: any) {
    console.error('getJobPostById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get job post' }
    };
  }
}

export async function getApprovedVacancyOptions(params?: {
  designationId?: string;
  includeLinkedToJobPostId?: string;
}): Promise<{
  success: boolean;
  data?: ApprovedVacancyOption[];
  error?: { message?: string };
}> {
  try {
    const where: Prisma.VacancyRequestWhereInput = {
      status: 'approved',
      OR: [
        { linkedJobPost: false },
        ...(params?.includeLinkedToJobPostId
          ? [{ linkedJobPostId: params.includeLinkedToJobPostId }]
          : [])
      ]
    };
    if (params?.designationId) {
      where.designationId = params.designationId;
    }

    const rows = await prisma.vacancyRequest.findMany({
      where,
      orderBy: { requestId: 'asc' }
    });

    const data: ApprovedVacancyOption[] = rows.map((row) => ({
      id: row.id,
      name: `${row.requestId} — ${row.designationName} (${row.departmentName})`,
      requestId: row.requestId,
      designationId: row.designationId,
      designationName: row.designationName,
      departmentId: row.departmentId,
      departmentName: row.departmentName,
      employmentType: row.employmentType as VacancyEmploymentType,
      openings: row.vacancies,
      skills: row.skills ?? []
    }));

    return { success: true, data };
  } catch (error: any) {
    console.error('getApprovedVacancyOptions error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to load approved vacancy options'
      }
    };
  }
}

export async function createJobPost(
  payload: JobPostPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: JobPostRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = jobPostPayloadSchema.safeParse(payload);
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
    const links = await resolveVacancyLinks(
      data.linkedVacancyRequestIds,
      data.designationId,
      data.employmentType
    );
    if (!links.ok) {
      return {
        success: false,
        error: { message: links.message, issues: links.issues }
      };
    }

    const generated = await generateRecordCode(JOB_POST_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: {
          message: 'Failed to generate job post code. Please try again.'
        }
      };
    }

    const slugSource = data.slug?.trim() || data.jobTitle;
    const slug = await ensureUniqueSlug(slugSource);
    const openings =
      links.suggestedOpenings > 0 ? links.suggestedOpenings : data.openings;
    const postedDate = data.status === 'published' ? new Date() : null;

    const created = await prisma.jobPost.create({
      data: {
        jobPostId: generated.code,
        slug,
        jobTitle: data.jobTitle,
        shortDescription: data.shortDescription,
        jobDescription: data.jobDescription,
        responsibilities: data.responsibilities,
        qualifications: data.qualifications,
        experience: data.experience,
        skills: data.skills,
        salaryInformation: data.salaryInformation,
        applicationInstructions: data.applicationInstructions,
        designationId: links.designationId,
        designationName: links.designationName,
        departmentId: data.departmentId || links.departmentId,
        departmentName: links.departmentName,
        employmentType: links.employmentType,
        openings,
        vacancyRequestIds: links.vacancyRequestIds,
        linkedVacancies: links.linkedVacancies,
        status: data.status,
        postedDate,
        closingDate: data.closingDate,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      }
    });

    if (links.vacancyRequestIds.length) {
      await syncVacancyLinks(created.id, links.vacancyRequestIds, []);
    }

    const [withUsers] = await resolveAuthUsers([created]);
    return {
      success: true,
      data: mapJobPostRecord(withUsers),
      message: 'Job post created successfully'
    };
  } catch (error: any) {
    console.error('createJobPost error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Duplicate record detected',
          issues: { slug: ['Job post code or slug already exists'] }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create job post' }
    };
  }
}

export async function updateJobPost(
  id: string,
  payload: JobPostPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: JobPostRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid job post ID' } };
    }

    const parsed = jobPostPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const existing = await prisma.jobPost.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'Job post not found' } };
    }
    if (existing.status === 'closed') {
      return {
        success: false,
        error: { message: 'Closed job posts cannot be edited' }
      };
    }

    const data = parsed.data;
    const auditUser = toAuditUser(user);
    const links = await resolveVacancyLinks(
      data.linkedVacancyRequestIds,
      data.designationId,
      data.employmentType,
      id
    );
    if (!links.ok) {
      return {
        success: false,
        error: { message: links.message, issues: links.issues }
      };
    }

    const slugSource = data.slug?.trim() || data.jobTitle;
    const slug = await ensureUniqueSlug(slugSource, id);
    const openings =
      links.vacancyRequestIds.length > 0
        ? links.suggestedOpenings || data.openings
        : data.openings;

    let postedDate = existing.postedDate;
    if (data.status === 'published' && !postedDate) {
      postedDate = new Date();
    }
    if (data.status === 'draft' || data.status === 'unpublished') {
      // keep historical postedDate if previously published
    }

    const previousIds = existing.vacancyRequestIds ?? [];
    const updated = await prisma.jobPost.update({
      where: { id },
      data: {
        slug,
        jobTitle: data.jobTitle,
        shortDescription: data.shortDescription,
        jobDescription: data.jobDescription,
        responsibilities: data.responsibilities,
        qualifications: data.qualifications,
        experience: data.experience,
        skills: data.skills,
        salaryInformation: data.salaryInformation,
        applicationInstructions: data.applicationInstructions,
        designationId: links.designationId,
        designationName: links.designationName,
        departmentId: data.departmentId || links.departmentId,
        departmentName: links.departmentName,
        employmentType: links.employmentType,
        openings,
        vacancyRequestIds: links.vacancyRequestIds,
        linkedVacancies: links.linkedVacancies,
        status: data.status,
        postedDate,
        closingDate: data.closingDate,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    await syncVacancyLinks(id, links.vacancyRequestIds, previousIds);

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapJobPostRecord(withUsers),
      message: 'Job post updated successfully'
    };
  } catch (error: any) {
    console.error('updateJobPost error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Duplicate record detected',
          issues: { slug: ['Slug already exists'] }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update job post' }
    };
  }
}
